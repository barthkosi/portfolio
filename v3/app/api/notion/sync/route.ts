import { type NextRequest, NextResponse } from "next/server";
import { getRuntimeSecret } from "@/lib/cloudflare-env";
import { isContentCategory } from "@/lib/content-types";
import { syncNotionCategories, syncNotionPageById } from "@/lib/notion";

export const dynamic = "force-dynamic";

type SyncRequestBody = {
  pageId?: string;
  category?: string;
  dryRun?: boolean;
};

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const syncSecret = await getRuntimeSecret("NOTION_SYNC_SECRET");
  if (!syncSecret) {
    return process.env.NODE_ENV === "development";
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : request.headers.get("x-sync-secret")?.trim() ?? "";

  return token.length > 0 && token === syncSecret;
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SyncRequestBody = {};
  try {
    const text = await request.text();
    if (text.trim().length > 0) {
      body = JSON.parse(text) as SyncRequestBody;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (body.pageId) {
      const result = await syncNotionPageById(body.pageId, {
        dryRun: Boolean(body.dryRun),
      });
      return NextResponse.json({ ok: true, mode: "page", result });
    }

    if (body.category) {
      if (!isContentCategory(body.category)) {
        return NextResponse.json(
          { error: "Invalid category. Use work, writing, or explorations." },
          { status: 400 },
        );
      }
      const result = await syncNotionCategories([body.category]);
      return NextResponse.json({ ok: true, mode: "category", result });
    }

    const result = await syncNotionCategories();
    return NextResponse.json({ ok: true, mode: "full", result });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to sync from Notion",
      },
      { status: 500 },
    );
  }
}
