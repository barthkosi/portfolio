import type { NotionHeadingLevel } from "@/components/BlogTextBlock";

export type ContentCategory = "work" | "writing" | "explorations";

export const CONTENT_CATEGORIES: ContentCategory[] = [
  "work",
  "writing",
  "explorations",
];

export function isContentCategory(value: string): value is ContentCategory {
  return (
    value === "work" || value === "writing" || value === "explorations"
  );
}

export type RichTextSpan = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  href?: string | null;
};

export type MediaBlockItem = {
  src: string;
  alt?: string;
  caption?: string;
  kind: "image" | "video";
  width?: number;
  height?: number;
};

export type ContentBlock =
  | {
      type: "heading";
      level: NotionHeadingLevel;
      richText: RichTextSpan[];
    }
  | {
      type: "paragraph";
      richText: RichTextSpan[];
    }
  | {
      type: "quote";
      richText: RichTextSpan[];
      author?: string;
    }
  | {
      type: "callout";
      richText: RichTextSpan[];
    }
  | {
      type: "media";
      items: MediaBlockItem[];
    }
  | {
      type: "bulleted_list";
      items: RichTextSpan[][];
    }
  | {
      type: "numbered_list";
      items: RichTextSpan[][];
    }
  | {
      type: "code";
      language: string;
      code: string;
    };

export type PostLayout = "default" | "showcase";

export type PostMeta = {
  id: string;
  slug: string;
  category: ContentCategory;
  layout?: PostLayout;
  title: string;
  description: string;
  date: string | null;
  genre: string[];
  coverImage: string | null;
  coverWidth?: number;
  coverHeight?: number;
  updatedAt: string;
};

export type PostDocument = {
  meta: PostMeta;
  blocks: ContentBlock[];
};

export type ContentIndex = {
  work: PostMeta[];
  writing: PostMeta[];
  explorations: PostMeta[];
  updatedAt: string;
};

export function createEmptyIndex(): ContentIndex {
  return {
    work: [],
    writing: [],
    explorations: [],
    updatedAt: new Date().toISOString(),
  };
}

export function slugifyTitle(title: string, fallbackId?: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug.length > 0) return slug;
  return (fallbackId ?? "post").replace(/-/g, "").slice(0, 12);
}

export function formatPostDate(date: string | null): string {
  if (!date) return "";
  const parsed = new Date(date.length === 10 ? `${date}T00:00:00Z` : date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatPostYear(date: string | null): string {
  if (!date) return "";
  const parsed = new Date(date.length === 10 ? `${date}T00:00:00Z` : date);
  if (Number.isNaN(parsed.getTime())) return date.slice(0, 4);
  return String(parsed.getUTCFullYear());
}
