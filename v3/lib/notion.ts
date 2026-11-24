import { getRuntimeSecret } from "@/lib/cloudflare-env";
import {
  putMediaObject,
  removePostByIdFromStore,
  replaceCategoryInStore,
  savePostToStore,
} from "@/lib/content-store";
import {
  CONTENT_CATEGORIES,
  type ContentBlock,
  type ContentCategory,
  type MediaBlockItem,
  type PostDocument,
  type PostLayout,
  type PostMeta,
  type RichTextSpan,
  slugifyTitle,
} from "@/lib/content-types";
import { parseImageDimensions } from "@/lib/media";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

const DEFAULT_SOURCES: Record<
  ContentCategory,
  { databaseId: string; dataSourceId: string }
> = {
  writing: {
    databaseId: "5720a90e-9358-839c-b69d-019135d84829",
    dataSourceId: "f140a90e-9358-831f-be7d-07fffcbac427",
  },
  work: {
    databaseId: "3bf0a90e-9358-81cf-9cd5-d2d2bea1bde4",
    dataSourceId: "3bf0a90e-9358-81d4-afa5-000b78980680",
  },
  explorations: {
    databaseId: "3bf0a90e-9358-8125-adb1-eb12ec7caba0",
    dataSourceId: "3bf0a90e-9358-8186-b684-000bbd1f43e9",
  },
};

type NotionRichTextItem = {
  plain_text?: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
  };
  text?: {
    content?: string;
    link?: { url?: string } | null;
  };
};

type NotionFileObject = {
  type?: "external" | "file";
  external?: { url?: string };
  file?: { url?: string };
  caption?: NotionRichTextItem[];
};

type NotionPropertyValue = {
  type?: string;
  title?: NotionRichTextItem[];
  rich_text?: NotionRichTextItem[];
  select?: { name?: string } | null;
  multi_select?: Array<{ name?: string }>;
  status?: { name?: string } | null;
  date?: { start?: string | null } | null;
};

type NotionPageObject = {
  id: string;
  archived?: boolean;
  in_trash?: boolean;
  created_time?: string;
  last_edited_time?: string;
  cover?: NotionFileObject | null;
  parent?: {
    type?: string;
    database_id?: string;
    data_source_id?: string;
  };
  properties?: Record<string, NotionPropertyValue>;
};

type NotionBlockObject = {
  id: string;
  type: string;
  has_children?: boolean;
  paragraph?: { rich_text?: NotionRichTextItem[] };
  heading_1?: { rich_text?: NotionRichTextItem[]; is_toggleable?: boolean };
  heading_2?: { rich_text?: NotionRichTextItem[]; is_toggleable?: boolean };
  heading_3?: { rich_text?: NotionRichTextItem[]; is_toggleable?: boolean };
  quote?: { rich_text?: NotionRichTextItem[] };
  callout?: { rich_text?: NotionRichTextItem[] };
  bulleted_list_item?: { rich_text?: NotionRichTextItem[] };
  numbered_list_item?: { rich_text?: NotionRichTextItem[] };
  toggle?: { rich_text?: NotionRichTextItem[] };
  code?: { rich_text?: NotionRichTextItem[]; language?: string };
  image?: NotionFileObject;
  video?: NotionFileObject;
};

type NotionListResponse<T> = {
  results: T[];
  has_more?: boolean;
  next_cursor?: string | null;
};

const VIDEO_EXT_RE = /\.(mp4|webm|mov)(\?.*)?$/i;
const MARKDOWN_MEDIA_RE = /^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/;

function compactId(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}

async function getNotionToken(): Promise<string> {
  const token =
    (await getRuntimeSecret("NOTION_API_KEY")) ??
    (await getRuntimeSecret("NOTION_TOKEN"));
  if (!token) {
    throw new Error(
      "Missing NOTION_API_KEY (or NOTION_TOKEN) secret in environment.",
    );
  }
  return token;
}

async function notionRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const token = await getNotionToken();
  const res = await fetch(`${NOTION_API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Notion API ${options.method ?? "GET"} ${path} failed (${res.status}): ${errText.slice(0, 300)}`,
    );
  }

  return (await res.json()) as T;
}

async function getDatabaseIdForCategory(
  category: ContentCategory,
): Promise<string> {
  const envKey =
    category === "work"
      ? "NOTION_WORK_DB_ID"
      : category === "writing"
        ? "NOTION_WRITING_DB_ID"
        : "NOTION_EXPLORATIONS_DB_ID";
  const override = await getRuntimeSecret(envKey);
  return override ?? DEFAULT_SOURCES[category].databaseId;
}

export async function resolveCategoryForParent(
  parent?: NotionPageObject["parent"],
): Promise<ContentCategory | null> {
  if (!parent) return null;
  const candidates = [parent.database_id, parent.data_source_id]
    .filter((value): value is string => Boolean(value))
    .map(compactId);

  if (candidates.length === 0) return null;

  for (const category of CONTENT_CATEGORIES) {
    const configuredDbId = compactId(await getDatabaseIdForCategory(category));
    const defaultDbId = compactId(DEFAULT_SOURCES[category].databaseId);
    const defaultDsId = compactId(DEFAULT_SOURCES[category].dataSourceId);
    if (
      candidates.includes(configuredDbId) ||
      candidates.includes(defaultDbId) ||
      candidates.includes(defaultDsId)
    ) {
      return category;
    }
  }

  return null;
}

function richTextToPlain(items?: NotionRichTextItem[]): string {
  if (!Array.isArray(items)) return "";
  return items.map((item) => item.plain_text ?? item.text?.content ?? "").join("");
}

function normalizeRichText(items?: NotionRichTextItem[]): RichTextSpan[] {
  if (!Array.isArray(items)) return [];
  const spans: RichTextSpan[] = [];
  for (const item of items) {
    const text = item.plain_text ?? item.text?.content ?? "";
    if (!text) continue;
    const href = item.href ?? item.text?.link?.url ?? null;
    const ann = item.annotations;
    const span: RichTextSpan = { text };
    if (ann?.bold) span.bold = true;
    if (ann?.italic) span.italic = true;
    if (ann?.strikethrough) span.strikethrough = true;
    if (ann?.underline) span.underline = true;
    if (ann?.code) span.code = true;
    if (href) span.href = href;
    spans.push(span);
  }
  return spans;
}

function getProperty(
  page: NotionPageObject,
  name: string,
): NotionPropertyValue | undefined {
  const props = page.properties;
  if (!props) return undefined;
  if (props[name]) return props[name];
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(props)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

function getPageStatus(page: NotionPageObject): string {
  const prop = getProperty(page, "Status");
  if (!prop) return "";
  return (prop.select?.name ?? prop.status?.name ?? "").trim();
}

function isPublishedPage(page: NotionPageObject): boolean {
  if (page.archived || page.in_trash) return false;
  return getPageStatus(page).toLowerCase() === "finished";
}

function extensionFromContentTypeOrUrl(
  contentType: string,
  url: string,
): string {
  const ct = contentType.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  if (map[ct]) return map[ct];

  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    if (match) return match[1].toLowerCase();
  } catch {
    return "bin";
  }
  return "bin";
}

async function resolveFileUrl(
  fileObj: NotionFileObject | null | undefined,
  pageId: string,
  assetId: string,
): Promise<string | null> {
  if (!fileObj) return null;
  if (fileObj.type === "external") {
    return fileObj.external?.url ?? null;
  }
  if (fileObj.type === "file" && fileObj.file?.url) {
    const sourceUrl = fileObj.file.url;
    const res = await fetch(sourceUrl, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(
        `Failed to download Notion media ${assetId} (${res.status})`,
      );
    }
    const contentType =
      res.headers.get("content-type") ?? "application/octet-stream";
    const ext = extensionFromContentTypeOrUrl(contentType, sourceUrl);
    const key = `blog-media/${compactId(pageId)}/${compactId(assetId)}.${ext}`;
    const bytes = await res.arrayBuffer();
    return putMediaObject(key, bytes, contentType);
  }
  return null;
}

function formatCodeLanguage(raw?: string): string {
  if (!raw) return "Code";
  const normalized = raw.trim().toLowerCase();
  const labels: Record<string, string> = {
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    javascript: "JavaScript",
    typescript: "TypeScript",
    jsx: "JSX",
    tsx: "TSX",
    json: "JSON",
    bash: "Bash",
    shell: "Shell",
    sql: "SQL",
    python: "Python",
    rust: "Rust",
    go: "Go",
    glsl: "GLSL",
    markdown: "Markdown",
    yaml: "YAML",
    "plain text": "Text",
  };
  if (labels[normalized]) return labels[normalized];
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function splitQuoteAuthor(spans: RichTextSpan[]): {
  richText: RichTextSpan[];
  author?: string;
} {
  const fullText = spans.map((s) => s.text).join("");
  const lines = fullText.split("\n");
  if (lines.length < 2) {
    return { richText: spans };
  }

  const lastLine = lines[lines.length - 1].trim();
  if (!lastLine.startsWith("-") || lastLine.length < 2) {
    return { richText: spans };
  }

  const trimmedSpans = spans.map((s) => ({ ...s }));
  let remaining = `\n${lines[lines.length - 1]}`.length;

  while (trimmedSpans.length > 0 && remaining > 0) {
    const tail = trimmedSpans[trimmedSpans.length - 1];
    if (tail.text.length <= remaining) {
      remaining -= tail.text.length;
      trimmedSpans.pop();
    } else {
      tail.text = tail.text.slice(0, tail.text.length - remaining);
      remaining = 0;
    }
  }

  return {
    richText: trimmedSpans,
    author: lastLine,
  };
}

async function fetchBlockChildren(
  blockId: string,
): Promise<NotionBlockObject[]> {
  const blocks: NotionBlockObject[] = [];
  let cursor: string | undefined;

  do {
    const query = cursor
      ? `?page_size=100&start_cursor=${encodeURIComponent(cursor)}`
      : "?page_size=100";
    const data = await notionRequest<NotionListResponse<NotionBlockObject>>(
      `/blocks/${blockId}/children${query}`,
    );
    blocks.push(...(data.results ?? []));
    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor);

  return blocks;
}

const IMAGE_HEADER_BYTES = 65536;

async function probeImageDimensions(
  url: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const res = await fetch(url, {
      headers: { Range: `bytes=0-${IMAGE_HEADER_BYTES - 1}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const slice =
      buffer.byteLength > IMAGE_HEADER_BYTES
        ? buffer.slice(0, IMAGE_HEADER_BYTES)
        : buffer;
    return parseImageDimensions(new Uint8Array(slice));
  } catch {
    return null;
  }
}

async function resolveMediaBlock(
  block: NotionBlockObject,
  pageId: string,
): Promise<MediaBlockItem | null> {
  if (block.type === "image" && block.image) {
    const src = await resolveFileUrl(block.image, pageId, block.id);
    if (!src) return null;
    const caption = richTextToPlain(block.image.caption).trim();
    const kind = VIDEO_EXT_RE.test(src) ? "video" : "image";
    const dimensions = kind === "image" ? await probeImageDimensions(src) : null;
    return {
      src,
      kind,
      ...(caption ? { caption, alt: caption } : {}),
      ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {}),
    };
  }

  if (block.type === "video" && block.video) {
    const src = await resolveFileUrl(block.video, pageId, block.id);
    if (!src) return null;
    const caption = richTextToPlain(block.video.caption).trim();
    return {
      src,
      kind: "video",
      ...(caption ? { caption, alt: caption } : {}),
    };
  }

  if (block.type === "paragraph") {
    const plain = richTextToPlain(block.paragraph?.rich_text).trim();
    const match = plain.match(MARKDOWN_MEDIA_RE);
    if (match) {
      const caption = match[1].trim();
      const src = match[2].trim();
      const kind = VIDEO_EXT_RE.test(src) ? "video" : "image";
      const dimensions = kind === "image" ? await probeImageDimensions(src) : null;
      return {
        src,
        kind,
        ...(caption ? { caption, alt: caption } : {}),
        ...(dimensions ? { width: dimensions.width, height: dimensions.height } : {}),
      };
    }
  }

  return null;
}

async function transformBlocks(
  notionBlocks: NotionBlockObject[],
  pageId: string,
): Promise<ContentBlock[]> {
  const result: ContentBlock[] = [];

  for (const block of notionBlocks) {
    if (block.type === "divider") {
      continue;
    }

    if (
      block.type === "heading_1" ||
      block.type === "heading_2" ||
      block.type === "heading_3"
    ) {
      const level =
        block.type === "heading_1" ? 1 : block.type === "heading_2" ? 2 : 3;
      const payload =
        block.type === "heading_1"
          ? block.heading_1
          : block.type === "heading_2"
            ? block.heading_2
            : block.heading_3;
      const richText = normalizeRichText(payload?.rich_text);
      if (richText.length > 0) {
        result.push({ type: "heading", level, richText });
      }
      if (block.has_children) {
        const children = await fetchBlockChildren(block.id);
        const childBlocks = await transformBlocks(children, pageId);
        result.push(...childBlocks);
      }
      continue;
    }

    if (block.type === "toggle") {
      const richText = normalizeRichText(block.toggle?.rich_text);
      if (richText.length > 0) {
        result.push({ type: "paragraph", richText });
      }
      if (block.has_children) {
        const children = await fetchBlockChildren(block.id);
        const childBlocks = await transformBlocks(children, pageId);
        result.push(...childBlocks);
      }
      continue;
    }

    if (block.type === "callout") {
      const richText = normalizeRichText(block.callout?.rich_text);
      if (richText.length > 0) {
        result.push({ type: "callout", richText });
      }
      if (block.has_children) {
        const children = await fetchBlockChildren(block.id);
        const childBlocks = await transformBlocks(children, pageId);
        result.push(...childBlocks);
      }
      continue;
    }

    if (block.type === "quote") {
      const richText = normalizeRichText(block.quote?.rich_text);
      if (richText.length > 0) {
        const { richText: bodySpans, author } = splitQuoteAuthor(richText);
        result.push({
          type: "quote",
          richText: bodySpans,
          ...(author ? { author } : {}),
        });
      }
      continue;
    }

    if (block.type === "bulleted_list_item") {
      const richText = normalizeRichText(block.bulleted_list_item?.rich_text);
      if (richText.length > 0) {
        const prev = result[result.length - 1];
        if (prev && prev.type === "bulleted_list") {
          prev.items.push(richText);
        } else {
          result.push({ type: "bulleted_list", items: [richText] });
        }
      }
      continue;
    }

    if (block.type === "numbered_list_item") {
      const richText = normalizeRichText(block.numbered_list_item?.rich_text);
      if (richText.length > 0) {
        const prev = result[result.length - 1];
        if (prev && prev.type === "numbered_list") {
          prev.items.push(richText);
        } else {
          result.push({ type: "numbered_list", items: [richText] });
        }
      }
      continue;
    }

    if (block.type === "code") {
      const code = richTextToPlain(block.code?.rich_text);
      result.push({
        type: "code",
        language: formatCodeLanguage(block.code?.language),
        code,
      });
      continue;
    }

    if (block.type === "image" || block.type === "video") {
      const media = await resolveMediaBlock(block, pageId);
      if (media) {
        result.push({ type: "media", items: [media] });
      }
      continue;
    }

    if (block.type === "column_list" && block.has_children) {
      const columns = await fetchBlockChildren(block.id);
      const columnChildrenList = await Promise.all(
        columns
          .filter((col) => col.type === "column")
          .map((col) =>
            col.has_children ? fetchBlockChildren(col.id) : Promise.resolve([]),
          ),
      );

      const nonEmptyColumns = columnChildrenList.map((children) =>
        children.filter(
          (child) =>
            child.type !== "paragraph" ||
            richTextToPlain(child.paragraph?.rich_text).trim().length > 0,
        ),
      );

      const mediaItems: MediaBlockItem[] = [];
      let allMedia = nonEmptyColumns.length > 0;

      for (const colChildren of nonEmptyColumns) {
        if (colChildren.length === 0) {
          allMedia = false;
          break;
        }
        for (const child of colChildren) {
          const media = await resolveMediaBlock(child, pageId);
          if (!media) {
            allMedia = false;
            break;
          }
          mediaItems.push(media);
        }
        if (!allMedia) break;
      }

      if (allMedia && mediaItems.length > 0) {
        result.push({ type: "media", items: mediaItems });
      } else {
        for (const colChildren of nonEmptyColumns) {
          const flattened = await transformBlocks(colChildren, pageId);
          result.push(...flattened);
        }
      }
      continue;
    }

    if (block.type === "paragraph") {
      const plain = richTextToPlain(block.paragraph?.rich_text).trim();
      if (!plain) continue;

      const media = await resolveMediaBlock(block, pageId);
      if (media) {
        result.push({ type: "media", items: [media] });
        continue;
      }

      const richText = normalizeRichText(block.paragraph?.rich_text);
      if (richText.length > 0) {
        result.push({ type: "paragraph", richText });
      }
      continue;
    }
  }

  return result;
}

async function buildPostDocument(
  page: NotionPageObject,
  category: ContentCategory,
): Promise<PostDocument> {
  const titleProp = getProperty(page, "Title");
  const title = richTextToPlain(titleProp?.title).trim() || "Untitled";

  const descriptionProp = getProperty(page, "Description");
  const description = richTextToPlain(descriptionProp?.rich_text).trim();

  const dateProp = getProperty(page, "Date Finished");
  const date =
    dateProp?.date?.start ??
    (page.created_time ? page.created_time.slice(0, 10) : null);

  const genreProp = getProperty(page, "Genre");
  const genre: string[] = [];
  if (genreProp?.select?.name) {
    genre.push(genreProp.select.name);
  } else if (Array.isArray(genreProp?.multi_select)) {
    for (const option of genreProp.multi_select) {
      if (option.name) genre.push(option.name);
    }
  }

  const layoutProp = getProperty(page, "Layout");
  const layoutName = (
    layoutProp?.select?.name ??
    layoutProp?.status?.name ??
    ""
  )
    .trim()
    .toLowerCase();
  const layout: PostLayout = layoutName === "showcase" ? "showcase" : "default";

  const slugProp = getProperty(page, "Slug");
  const customSlugRaw = richTextToPlain(slugProp?.rich_text)
    .trim()
    .replace(/^\/+|\/+$/g, "");
  const slug = customSlugRaw
    ? slugifyTitle(customSlugRaw, page.id)
    : slugifyTitle(title, page.id);

  const coverImage = await resolveFileUrl(page.cover, page.id, "cover");
  const coverDimensions =
    coverImage && !VIDEO_EXT_RE.test(coverImage)
      ? await probeImageDimensions(coverImage)
      : null;
  const rawBlocks = await fetchBlockChildren(page.id);
  const blocks = await transformBlocks(rawBlocks, page.id);

  const meta: PostMeta = {
    id: page.id,
    slug,
    category,
    layout,
    title,
    description,
    date,
    genre,
    coverImage,
    ...(coverDimensions
      ? {
          coverWidth: coverDimensions.width,
          coverHeight: coverDimensions.height,
        }
      : {}),
    updatedAt: page.last_edited_time ?? new Date().toISOString(),
  };

  return { meta, blocks };
}

export async function syncNotionPageById(
  pageId: string,
  options: { dryRun?: boolean; force?: boolean } = {},
): Promise<{
  action: "published" | "removed" | "skipped";
  category?: ContentCategory;
  slug?: string;
  key?: string;
  removedKeys?: string[];
  skippedStale?: boolean;
  document?: PostDocument;
}> {
  const page = await notionRequest<NotionPageObject>(`/pages/${pageId}`);
  const category = await resolveCategoryForParent(page.parent);

  if (!category) {
    return { action: "skipped" };
  }

  if (!isPublishedPage(page)) {
    if (options.dryRun) {
      return { action: "removed", category };
    }
    const { removedKeys } = await removePostByIdFromStore(page.id);
    return { action: "removed", category, removedKeys };
  }

  const post = await buildPostDocument(page, category);
  if (options.dryRun) {
    return {
      action: "published",
      category,
      slug: post.meta.slug,
      document: post,
    };
  }
  const { key, removedOldKeys, skippedStale } = await savePostToStore(post, {
    force: options.force,
  });
  return {
    action: skippedStale ? "skipped" : "published",
    category,
    slug: post.meta.slug,
    key,
    removedKeys: removedOldKeys,
    ...(skippedStale ? { skippedStale: true } : {}),
  };
}

async function queryFinishedPages(
  databaseId: string,
): Promise<NotionPageObject[]> {
  const pages: NotionPageObject[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filter: {
        property: "Status",
        select: { equals: "Finished" },
      },
      page_size: 100,
    };
    if (cursor) body.start_cursor = cursor;

    const data = await notionRequest<NotionListResponse<NotionPageObject>>(
      `/databases/${databaseId}/query`,
      { method: "POST", body },
    );
    pages.push(...(data.results ?? []));
    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor);

  return pages;
}

export async function syncNotionCategories(
  categories: ContentCategory[] = CONTENT_CATEGORIES,
): Promise<
  Record<
    string,
    { count: number; slugs: string[]; savedKeys: string[]; removedKeys: string[] }
  >
> {
  const summary: Record<
    string,
    { count: number; slugs: string[]; savedKeys: string[]; removedKeys: string[] }
  > = {};

  for (const category of categories) {
    const dbId = await getDatabaseIdForCategory(category);
    const pages = await queryFinishedPages(dbId);
    const publishedPages = pages.filter(isPublishedPage);

    const posts: PostDocument[] = [];
    for (const page of publishedPages) {
      const doc = await buildPostDocument(page, category);
      posts.push(doc);
    }

    const { savedKeys, removedKeys } = await replaceCategoryInStore(
      category,
      posts,
    );
    summary[category] = {
      count: posts.length,
      slugs: posts.map((p) => p.meta.slug),
      savedKeys,
      removedKeys,
    };
  }

  return summary;
}
