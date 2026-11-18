import { type NextRequest, NextResponse } from "next/server";
import {
  buildMediaUrl,
  formatMediaAlt,
  type MediaItem,
  normalizeFolderPrefix,
  parseImageDimensions,
} from "@/lib/media";

export const dynamic = "force-dynamic";

type NormalizedObject = {
  key: string;
  size: number;
  uploadedMs: number;
  contentType: string;
  customWidth: number;
  customHeight: number;
};

type R2ObjectMeta = {
  key: string;
  size: number;
  uploaded: Date;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
};

type R2BucketHandle = {
  list: (options?: {
    prefix?: string;
    cursor?: string;
    limit?: number;
  }) => Promise<{
    objects: R2ObjectMeta[];
    truncated: boolean;
    cursor?: string;
  }>;
  get: (
    key: string,
    options?: { range?: { offset: number; length: number } },
  ) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer> } | null>;
};

type RestR2Object = {
  key: string;
  size: number;
  last_modified: string;
  http_metadata?: { contentType?: string };
  custom_metadata?: Record<string, string>;
};

type RestR2ListResponse = {
  success: boolean;
  result?: RestR2Object[];
  result_info?: { cursor?: string; is_truncated?: boolean };
};

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
const RASTER_HEADER_RE = /\.(png|jpe?g|webp|gif)$/i;
const HEADER_READ_BYTES = 32768;

async function getPortfolioBucket(): Promise<R2BucketHandle | null> {
  try {
    const specifier: string = "cloudflare:workers";
    const mod = (await import(
      /* @vite-ignore */ /* webpackIgnore: true */ specifier
    )) as {
      env?: { PORTFOLIO_BUCKET?: R2BucketHandle };
    };
    return mod.env?.PORTFOLIO_BUCKET ?? null;
  } catch {
    return null;
  }
}

function isImageCandidate(obj: NormalizedObject): boolean {
  if (obj.key.endsWith("/") || obj.size === 0) return false;
  return obj.contentType.startsWith("image/") || IMAGE_EXT_RE.test(obj.key);
}

function sortMediaObjects(objects: NormalizedObject[]): NormalizedObject[] {
  return objects.filter(isImageCandidate).sort((a, b) => {
    const timeDiff = b.uploadedMs - a.uploadedMs;
    return timeDiff !== 0 ? timeDiff : a.key.localeCompare(b.key);
  });
}

async function listFromBinding(
  bucket: R2BucketHandle,
  prefix: string,
): Promise<MediaItem[]> {
  const rawObjects: R2ObjectMeta[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({
      prefix: prefix || undefined,
      cursor,
      limit: 500,
    });
    rawObjects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const normalized = sortMediaObjects(
    rawObjects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploadedMs: obj.uploaded.getTime(),
      contentType: obj.httpMetadata?.contentType ?? "",
      customWidth: Number(obj.customMetadata?.width) || 0,
      customHeight: Number(obj.customMetadata?.height) || 0,
    })),
  );

  return Promise.all(
    normalized.map(async (obj) => {
      let dimensions: { width: number; height: number } | null =
        obj.customWidth > 0 && obj.customHeight > 0
          ? { width: obj.customWidth, height: obj.customHeight }
          : null;

      if (!dimensions && RASTER_HEADER_RE.test(obj.key)) {
        try {
          const object = await bucket.get(obj.key, {
            range: { offset: 0, length: HEADER_READ_BYTES },
          });
          if (object) {
            const buffer = await object.arrayBuffer();
            dimensions = parseImageDimensions(new Uint8Array(buffer));
          }
        } catch {
          dimensions = null;
        }
      }

      return {
        id: obj.key,
        key: obj.key,
        src: buildMediaUrl(obj.key),
        alt: formatMediaAlt(obj.key),
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
      };
    }),
  );
}

async function listFromCloudflareApi(
  accountId: string,
  apiToken: string,
  bucketName: string,
  prefix: string,
): Promise<MediaItem[]> {
  const rawObjects: RestR2Object[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucketName)}/objects`,
    );
    if (prefix) url.searchParams.set("prefix", prefix);
    url.searchParams.set("per_page", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Cloudflare R2 API request failed (${res.status})`);
    }
    const data = (await res.json()) as RestR2ListResponse;
    if (!data.success) {
      throw new Error("Cloudflare R2 API returned an error");
    }
    rawObjects.push(...(data.result ?? []));
    cursor = data.result_info?.is_truncated
      ? data.result_info.cursor
      : undefined;
  } while (cursor);

  const normalized = sortMediaObjects(
    rawObjects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploadedMs: Date.parse(obj.last_modified) || 0,
      contentType: obj.http_metadata?.contentType ?? "",
      customWidth: Number(obj.custom_metadata?.width) || 0,
      customHeight: Number(obj.custom_metadata?.height) || 0,
    })),
  );

  return Promise.all(
    normalized.map(async (obj) => {
      const src = buildMediaUrl(obj.key);
      let dimensions: { width: number; height: number } | null =
        obj.customWidth > 0 && obj.customHeight > 0
          ? { width: obj.customWidth, height: obj.customHeight }
          : null;

      if (!dimensions && RASTER_HEADER_RE.test(obj.key)) {
        try {
          const rangeRes = await fetch(src, {
            headers: { Range: `bytes=0-${HEADER_READ_BYTES - 1}` },
            cache: "no-store",
          });
          if (rangeRes.ok) {
            const buffer = await rangeRes.arrayBuffer();
            dimensions = parseImageDimensions(new Uint8Array(buffer));
          }
        } catch {
          dimensions = null;
        }
      }

      return {
        id: obj.key,
        key: obj.key,
        src,
        alt: formatMediaAlt(obj.key),
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
      };
    }),
  );
}

export async function GET(request: NextRequest) {
  const prefix = normalizeFolderPrefix(
    request.nextUrl.searchParams.get("folder"),
  );
  if (prefix === null) {
    return NextResponse.json(
      { error: "Invalid folder parameter", items: [] },
      { status: 400 },
    );
  }

  const bucket = await getPortfolioBucket();
  if (bucket) {
    const items = await listFromBinding(bucket, prefix);
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (process.env.NODE_ENV === "development") {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET ?? "portfolio";

    if (accountId && apiToken) {
      try {
        const items = await listFromCloudflareApi(
          accountId,
          apiToken,
          bucketName,
          prefix,
        );
        return NextResponse.json(
          { items },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch (err) {
        return NextResponse.json(
          {
            error:
              err instanceof Error
                ? err.message
                : "Failed to fetch R2 objects via Cloudflare API",
            items: [],
          },
          { status: 502, headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    const devProxyOrigin = process.env.CLOUDFLARE_MEDIA_ORIGIN;
    if (devProxyOrigin) {
      const folderParam = prefix.replace(/\/$/, "");
      try {
        const upstream = await fetch(
          `${devProxyOrigin.replace(/\/+$/, "")}/api/media?folder=${encodeURIComponent(folderParam)}`,
          { cache: "no-store" },
        );
        if (upstream.ok) {
          const data = await upstream.json();
          return NextResponse.json(data, {
            headers: { "Cache-Control": "no-store" },
          });
        }
      } catch {
        // Fall through to 503 when upstream proxy fails in local dev.
      }
    }
  }

  return NextResponse.json(
    {
      error:
        "R2 binding PORTFOLIO_BUCKET is unavailable in Node dev. Use npm run dev:vinext or configure CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (or CLOUDFLARE_MEDIA_ORIGIN) in .env.local.",
      items: [],
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
