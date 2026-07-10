import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type ContentType = "writing" | "work" | "explorations";

export interface ContentItem {
  slug: string;
  type: ContentType;
  title: string;
  date: string;
  description: string;
  coverImage?: string;
  bannerImage?: string;
  tags?: string[];
  buttonText?: string;
  buttonLink?: string;
  layout?: "default" | "full";
  locked?: boolean;
  content: string;
}

const contentDirectory = path.join(process.cwd(), "src/content");
const markdownExtension = ".md";

export const getContent = (type: ContentType): ContentItem[] => {
  const typeDir = path.join(contentDirectory, type);

  if (!fs.existsSync(typeDir)) {
    return [];
  }

  const files = fs
    .readdirSync(typeDir)
    .filter((file) => file.endsWith(markdownExtension));

  const items = files.map((filename) => {
    const filePath = path.join(typeDir, filename);
    const fileContents = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContents);
    const slug = filename.replace(markdownExtension, "");

    return {
      slug,
      type,
      title: data.title || "Untitled",
      date: data.date || new Date().toISOString(),
      description: data.description || "",
      coverImage: data.coverImage,
      bannerImage: data.bannerImage,
      tags: data.tags || [],
      buttonText: data.buttonText,
      buttonLink: data.buttonLink,
      layout: data.layout === "full" ? "full" : "default",
      locked: data.locked === true,
      content: content || "",
    } as ContentItem;
  });

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
  const items = getContent(type);
  return items.find((item) => item.slug === slug);
};

export const getAllSlugs = (type: ContentType): string[] => {
  const items = getContent(type);
  return items.map((item) => item.slug);
};
