import {
  getPortfolioBucket,
  getRuntimeSecret,
  type R2BucketLike,
} from "@/lib/cloudflare-env";
import {
  CONTENT_CATEGORIES,
  type ContentCategory,
  type ContentIndex,
  createEmptyIndex,
  type PostDocument,
  type PostMeta,
} from "@/lib/content-types";
import { buildMediaUrl } from "@/lib/media";

const INDEX_KEY = "content/index.json";
const CACHE_ORIGIN = "https://content-cache.barthkosi.internal";

type WorkersCacheStorage = {
  default: {
    match: (request: Request | string) => Promise<Response | undefined>;
    put: (request: Request | string, response: Response) => Promise<void>;
    delete: (request: Request | string) => Promise<boolean>;
  };
};

function postKey(category: ContentCategory, slug: string): string {
  return `content/${category}/${slug}.json`;
}

function getEdgeCache(): WorkersCacheStorage["default"] | null {
  try {
    const maybeCaches = (globalThis as unknown as { caches?: WorkersCacheStorage })
      .caches;
    if (maybeCaches && maybeCaches.default) {
      return maybeCaches.default;
    }
    return null;
  } catch {
    return null;
  }
}

function cacheUrlForKey(key: string): string {
  return `${CACHE_ORIGIN}/${key}`;
}

async function purgeEdgeCache(keys: string[]): Promise<void> {
  const edgeCache = getEdgeCache();
  if (!edgeCache) return;
  await Promise.all(
    keys.map((key) => edgeCache.delete(cacheUrlForKey(key)).catch(() => false)),
  );
}

async function getR2ApiConfig(): Promise<{
  accountId: string;
  apiToken: string;
  bucketName: string;
} | null> {
  const accountId = await getRuntimeSecret("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = await getRuntimeSecret("CLOUDFLARE_API_TOKEN");
  const bucketName =
    (await getRuntimeSecret("CLOUDFLARE_R2_BUCKET")) ?? "portfolio";

  if (!accountId || !apiToken) return null;
  return { accountId, apiToken, bucketName };
}

function r2RestObjectUrl(
  accountId: string,
  bucketName: string,
  key: string,
): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucketName)}/objects/${encodedKey}`;
}

async function readJsonFromBucket(
  bucket: R2BucketLike,
  key: string,
): Promise<string | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;
  return obj.text();
}

async function readJsonObject<T>(key: string): Promise<T | null> {
  const edgeCache = getEdgeCache();
  if (edgeCache) {
    const cached = await edgeCache.match(cacheUrlForKey(key));
    if (cached) {
      return (await cached.json()) as T;
    }
  }

  let rawText: string | null = null;
  const bucket = await getPortfolioBucket();

  if (bucket) {
    rawText = await readJsonFromBucket(bucket, key);
  } else {
    const apiConfig = await getR2ApiConfig();
    if (apiConfig) {
      const res = await fetch(
        r2RestObjectUrl(apiConfig.accountId, apiConfig.bucketName, key),
        {
          headers: { Authorization: `Bearer ${apiConfig.apiToken}` },
          cache: "no-store",
        },
      );
      if (res.status === 404) {
        return null;
      }
      if (res.ok) {
        rawText = await res.text();
      }
    }

    if (rawText === null) {
      const cdnRes = await fetch(buildMediaUrl(key), { cache: "no-store" });
      if (cdnRes.ok) {
        rawText = await cdnRes.text();
      }
    }
  }

  if (rawText === null) return null;

  if (edgeCache) {
    const cacheResponse = new Response(rawText, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=31536000",
      },
    });
    await edgeCache.put(cacheUrlForKey(key), cacheResponse).catch(() => {});
  }

  return JSON.parse(rawText) as T;
}

async function writeObject(
  key: string,
  body: string | ArrayBuffer | Uint8Array,
  contentType: string,
  cacheControl?: string,
): Promise<void> {
  const bucket = await getPortfolioBucket();
  if (bucket) {
    await bucket.put(key, body, {
      httpMetadata: {
        contentType,
        ...(cacheControl ? { cacheControl } : {}),
      },
    });
    await purgeEdgeCache([key]);
    return;
  }

  const apiConfig = await getR2ApiConfig();
  if (!apiConfig) {
    throw new Error(
      "R2 binding PORTFOLIO_BUCKET and Cloudflare R2 REST credentials are unavailable.",
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiConfig.apiToken}`,
    "Content-Type": contentType,
  };
  if (cacheControl) {
    headers["Cache-Control"] = cacheControl;
  }

  const res = await fetch(
    r2RestObjectUrl(apiConfig.accountId, apiConfig.bucketName, key),
    {
      method: "PUT",
      headers,
      body:
        body instanceof Uint8Array
          ? new Blob([new Uint8Array(body)], { type: contentType })
          : body,
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Failed to upload ${key} to R2 (${res.status}): ${errText.slice(0, 200)}`,
    );
  }
}

async function deleteObject(key: string): Promise<void> {
  const bucket = await getPortfolioBucket();
  if (bucket) {
    await bucket.delete(key);
    await purgeEdgeCache([key]);
    return;
  }

  const apiConfig = await getR2ApiConfig();
  if (!apiConfig) {
    throw new Error(
      "R2 binding PORTFOLIO_BUCKET and Cloudflare R2 REST credentials are unavailable.",
    );
  }

  const res = await fetch(
    r2RestObjectUrl(apiConfig.accountId, apiConfig.bucketName, key),
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiConfig.apiToken}` },
    },
  );

  if (!res.ok && res.status !== 404) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Failed to delete ${key} from R2 (${res.status}): ${errText.slice(0, 200)}`,
    );
  }
}

function sortPostsByDateDesc(posts: PostMeta[]): PostMeta[] {
  return [...posts].sort((a, b) => {
    const aTime = a.date ? Date.parse(a.date) : 0;
    const bTime = b.date ? Date.parse(b.date) : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.title.localeCompare(b.title);
  });
}

export async function getContentIndex(): Promise<ContentIndex> {
  const existing = await readJsonObject<ContentIndex>(INDEX_KEY);
  if (!existing) return createEmptyIndex();
  return {
    work: Array.isArray(existing.work) ? existing.work : [],
    writing: Array.isArray(existing.writing) ? existing.writing : [],
    explorations: Array.isArray(existing.explorations)
      ? existing.explorations
      : [],
    updatedAt: existing.updatedAt ?? new Date().toISOString(),
  };
}

export async function getPostBySlug(
  category: ContentCategory,
  slug: string,
): Promise<PostDocument | null> {
  return readJsonObject<PostDocument>(postKey(category, slug));
}

export async function putMediaObject(
  key: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  await writeObject(
    key,
    bytes,
    contentType,
    "public, max-age=31536000, immutable",
  );
  return buildMediaUrl(key);
}

export async function savePostToStore(post: PostDocument): Promise<{
  key: string;
  removedOldKeys: string[];
}> {
  const index = await getContentIndex();
  const removedOldKeys: string[] = [];

  for (const cat of CONTENT_CATEGORIES) {
    const prevList = index[cat];
    const nextList: PostMeta[] = [];
    for (const item of prevList) {
      if (item.id === post.meta.id) {
        if (cat !== post.meta.category || item.slug !== post.meta.slug) {
          const oldKey = postKey(cat, item.slug);
          await deleteObject(oldKey);
          removedOldKeys.push(oldKey);
        }
      } else {
        nextList.push(item);
      }
    }
    index[cat] = nextList;
  }

  index[post.meta.category] = sortPostsByDateDesc([
    ...index[post.meta.category],
    post.meta,
  ]);
  index.updatedAt = new Date().toISOString();

  const targetKey = postKey(post.meta.category, post.meta.slug);
  await writeObject(
    targetKey,
    JSON.stringify(post),
    "application/json; charset=utf-8",
  );
  await writeObject(
    INDEX_KEY,
    JSON.stringify(index),
    "application/json; charset=utf-8",
  );

  await purgeEdgeCache([targetKey, INDEX_KEY, ...removedOldKeys]);
  return { key: targetKey, removedOldKeys };
}

export async function removePostByIdFromStore(
  pageId: string,
): Promise<{ removedKeys: string[] }> {
  const normalized = pageId.replace(/-/g, "").toLowerCase();
  const index = await getContentIndex();
  const removedKeys: string[] = [];

  for (const cat of CONTENT_CATEGORIES) {
    const nextList: PostMeta[] = [];
    for (const item of index[cat]) {
      if (item.id.replace(/-/g, "").toLowerCase() === normalized) {
        const key = postKey(cat, item.slug);
        await deleteObject(key);
        removedKeys.push(key);
      } else {
        nextList.push(item);
      }
    }
    index[cat] = nextList;
  }

  if (removedKeys.length > 0) {
    index.updatedAt = new Date().toISOString();
    await writeObject(
      INDEX_KEY,
      JSON.stringify(index),
      "application/json; charset=utf-8",
    );
    await purgeEdgeCache([INDEX_KEY, ...removedKeys]);
  }

  return { removedKeys };
}

export async function replaceCategoryInStore(
  category: ContentCategory,
  posts: PostDocument[],
): Promise<{ savedKeys: string[]; removedKeys: string[] }> {
  const index = await getContentIndex();
  const previous = index[category];
  const nextSlugs = new Set(posts.map((p) => p.meta.slug));
  const savedKeys: string[] = [];
  const removedKeys: string[] = [];

  for (const post of posts) {
    const key = postKey(category, post.meta.slug);
    await writeObject(
      key,
      JSON.stringify(post),
      "application/json; charset=utf-8",
    );
    savedKeys.push(key);
  }

  for (const oldMeta of previous) {
    if (!nextSlugs.has(oldMeta.slug)) {
      const key = postKey(category, oldMeta.slug);
      await deleteObject(key);
      removedKeys.push(key);
    }
  }

  index[category] = sortPostsByDateDesc(posts.map((p) => p.meta));
  index.updatedAt = new Date().toISOString();

  await writeObject(
    INDEX_KEY,
    JSON.stringify(index),
    "application/json; charset=utf-8",
  );
  await purgeEdgeCache([INDEX_KEY, ...savedKeys, ...removedKeys]);

  return { savedKeys, removedKeys };
}
