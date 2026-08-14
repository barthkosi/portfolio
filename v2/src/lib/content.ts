import {
  getContentByType,
  getContentBySlug,
  getAllSlugsByType,
  type ContentItem,
  type ContentType,
} from "./db";

export type { ContentType, ContentItem };

export const getContent = (type: ContentType): ContentItem[] => {
  return getContentByType(type);
};

export const getAllContent = (): ContentItem[] => {
  const work = getContent("work");
  const writing = getContent("writing");
  const explorations = getContent("explorations");
  const items = [...work, ...writing, ...explorations];
  return items.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
};

export const getAllTags = (items: ContentItem[]): string[] => {
  const tags = new Set<string>();
  items.forEach((item) => {
    item.tags?.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
};

export const getPostBySlug = (
  type: ContentType,
  slug: string,
): ContentItem | undefined => {
  return getContentBySlug(type, slug);
};

export const getAllSlugs = (type: ContentType): string[] => {
  return getAllSlugsByType(type);
};
