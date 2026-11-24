import { type NextRequest, NextResponse } from "next/server";
import {
  getNotionSyncDebouncer,
  getRuntimeSecret,
} from "@/lib/cloudflare-env";
import { removePostByIdFromStore } from "@/lib/content-store";
import { syncNotionPageById } from "@/lib/notion";

export const dynamic = "force-dynamic";

type NotionWebhookPayload = {
  verification_token?: string;
  type?: string;
  entity?: {
    id?: string;
    type?: string;
  };
};

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifyNotionSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const expectedHex = signatureHeader.slice("sha256=".length).trim().toLowerCase();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody),
  );
  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqualHex(computedHex, expectedHex);
}

const SYNC_PAGE_EVENTS = new Set([
  "page.created",
  "page.properties_updated",
  "page.content_updated",
  "page.undeleted",
  "page.moved",
]);

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let payload: NotionWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as NotionWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (payload.verification_token) {
    console.log(
      "[notion-webhook] verification_token:",
      payload.verification_token,
    );
    return NextResponse.json({ ok: true, verified: true });
  }

  const webhookSecret = await getRuntimeSecret("NOTION_WEBHOOK_SECRET");
  if (webhookSecret) {
    const signature = request.headers.get("x-notion-signature");
    const valid = await verifyNotionSignature(rawBody, signature, webhookSecret);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid Notion webhook signature" },
        { status: 401 },
      );
    }
  }

  const eventType = payload.type ?? "";
  const entityId = payload.entity?.id;
  const entityType = payload.entity?.type;

  if (!entityId || (entityType && entityType !== "page")) {
    return NextResponse.json({ ok: true, ignored: true, eventType });
  }

  try {
    const isDelete = eventType === "page.deleted";
    const isSync = SYNC_PAGE_EVENTS.has(eventType);

    if (!isDelete && !isSync) {
      return NextResponse.json({ ok: true, ignored: true, eventType });
    }

    const debouncer = await getNotionSyncDebouncer();
    if (debouncer) {
      const queued = await debouncer.schedulePageEvent({
        pageId: entityId,
        eventType,
        action: isDelete ? "delete" : "sync",
      });
      return NextResponse.json({
        ok: true,
        eventType,
        ...queued,
      });
    }

    if (isDelete) {
      const removed = await removePostByIdFromStore(entityId);
      return NextResponse.json({
        ok: true,
        eventType,
        action: "removed",
        ...removed,
      });
    }

    const outcome = await syncNotionPageById(entityId);
    return NextResponse.json({
      ok: true,
      eventType,
      ...outcome,
    });
  } catch (err) {
    console.error("[notion-webhook] sync error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to process Notion webhook event",
      },
      { status: 500 },
    );
  }
}
