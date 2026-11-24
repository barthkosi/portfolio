import { DurableObject } from "cloudflare:workers";
import { removePostByIdFromStore } from "@/lib/content-store";
import { syncNotionPageById } from "@/lib/notion";

const DEFAULT_DEBOUNCE_MS = 15_000;
const DEFAULT_MAX_WAIT_MS = 60_000;
const MIN_DEBOUNCE_MS = 1_000;
const MAX_DEBOUNCE_MS = 120_000;
const RETRY_BASE_DELAY_MS = 15_000;
const MAX_ATTEMPTS = 3;

export type DebouncedPageAction = "sync" | "delete";

export type SchedulePageEventInput = {
  pageId: string;
  eventType: string;
  action: DebouncedPageAction;
};

export type SchedulePageEventResult = {
  queued: true;
  pageId: string;
  action: DebouncedPageAction;
  scheduledAt: string;
  debounceMs: number;
};

type PendingPageRow = {
  page_id: string;
  action: DebouncedPageAction;
  event_type: string;
  first_received_at: number;
  last_received_at: number;
  scheduled_at: number;
  attempts: number;
};

type DebouncerEnv = Record<string, unknown> & {
  NOTION_WEBHOOK_DEBOUNCE_MS?: string;
  NOTION_WEBHOOK_MAX_WAIT_MS?: string;
};

function parseClampedMs(
  raw: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof raw !== "string" && typeof raw !== "number") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export class NotionSyncDebouncer extends DurableObject<DebouncerEnv> {
  constructor(ctx: DurableObjectState, env: DebouncerEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS pending_pages (
          page_id TEXT PRIMARY KEY,
          action TEXT NOT NULL,
          event_type TEXT NOT NULL,
          first_received_at INTEGER NOT NULL,
          last_received_at INTEGER NOT NULL,
          scheduled_at INTEGER NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0
        )
      `);
    });
  }

  private getDebounceConfig(): { debounceMs: number; maxWaitMs: number } {
    const debounceMs = parseClampedMs(
      this.env.NOTION_WEBHOOK_DEBOUNCE_MS,
      DEFAULT_DEBOUNCE_MS,
      MIN_DEBOUNCE_MS,
      MAX_DEBOUNCE_MS,
    );
    const maxWaitMs = parseClampedMs(
      this.env.NOTION_WEBHOOK_MAX_WAIT_MS,
      DEFAULT_MAX_WAIT_MS,
      debounceMs,
      300_000,
    );
    return { debounceMs, maxWaitMs };
  }

  private async scheduleNextAlarm(): Promise<void> {
    const rows = this.ctx.storage.sql
      .exec<{ next_at: number | null }>(
        "SELECT MIN(scheduled_at) AS next_at FROM pending_pages",
      )
      .toArray();
    const nextAt = rows[0]?.next_at;
    if (typeof nextAt === "number" && Number.isFinite(nextAt)) {
      await this.ctx.storage.setAlarm(nextAt);
    }
  }

  async schedulePageEvent(
    input: SchedulePageEventInput,
  ): Promise<SchedulePageEventResult> {
    const pageId = input.pageId.trim();
    const now = Date.now();
    const { debounceMs, maxWaitMs } = this.getDebounceConfig();

    const existingRows = this.ctx.storage.sql
      .exec<{ first_received_at: number }>(
        "SELECT first_received_at FROM pending_pages WHERE page_id = ?",
        pageId,
      )
      .toArray();

    const firstReceivedAt = existingRows[0]?.first_received_at ?? now;
    const cappedScheduledAt = Math.min(
      now + debounceMs,
      firstReceivedAt + maxWaitMs,
    );
    const scheduledAt = Math.max(now + 500, cappedScheduledAt);

    this.ctx.storage.sql.exec(
      `INSERT INTO pending_pages (
        page_id,
        action,
        event_type,
        first_received_at,
        last_received_at,
        scheduled_at,
        attempts
      ) VALUES (?, ?, ?, ?, ?, ?, 0)
      ON CONFLICT(page_id) DO UPDATE SET
        action = excluded.action,
        event_type = excluded.event_type,
        last_received_at = excluded.last_received_at,
        scheduled_at = excluded.scheduled_at,
        attempts = 0`,
      pageId,
      input.action,
      input.eventType,
      firstReceivedAt,
      now,
      scheduledAt,
    );

    await this.scheduleNextAlarm();

    return {
      queued: true,
      pageId,
      action: input.action,
      scheduledAt: new Date(scheduledAt).toISOString(),
      debounceMs,
    };
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const dueRows = this.ctx.storage.sql
      .exec<PendingPageRow>(
        `SELECT page_id, action, event_type, first_received_at, last_received_at, scheduled_at, attempts
         FROM pending_pages
         WHERE scheduled_at <= ?
         ORDER BY scheduled_at ASC`,
        now,
      )
      .toArray();

    for (const row of dueRows) {
      try {
        if (row.action === "delete") {
          const removed = await removePostByIdFromStore(row.page_id);
          console.log("[notion-sync-debouncer] removed page:", {
            pageId: row.page_id,
            eventType: row.event_type,
            removedKeys: removed.removedKeys,
          });
        } else {
          const outcome = await syncNotionPageById(row.page_id);
          console.log("[notion-sync-debouncer] synced page:", {
            pageId: row.page_id,
            eventType: row.event_type,
            action: outcome.action,
            slug: outcome.slug,
            removedKeys: outcome.removedKeys,
          });
        }

        // Only remove if no newer webhook arrived for this page while syncing.
        this.ctx.storage.sql.exec(
          "DELETE FROM pending_pages WHERE page_id = ? AND last_received_at = ?",
          row.page_id,
          row.last_received_at,
        );
      } catch (err) {
        const nextAttempts = row.attempts + 1;
        console.error("[notion-sync-debouncer] sync error:", {
          pageId: row.page_id,
          eventType: row.event_type,
          attempt: nextAttempts,
          error: err instanceof Error ? err.message : String(err),
        });

        if (nextAttempts < MAX_ATTEMPTS) {
          const retryAt = Date.now() + RETRY_BASE_DELAY_MS * nextAttempts;
          this.ctx.storage.sql.exec(
            `UPDATE pending_pages
             SET attempts = ?, scheduled_at = ?
             WHERE page_id = ? AND last_received_at = ?`,
            nextAttempts,
            retryAt,
            row.page_id,
            row.last_received_at,
          );
        } else {
          this.ctx.storage.sql.exec(
            "DELETE FROM pending_pages WHERE page_id = ? AND last_received_at = ?",
            row.page_id,
            row.last_received_at,
          );
        }
      }
    }

    await this.scheduleNextAlarm();
  }
}
