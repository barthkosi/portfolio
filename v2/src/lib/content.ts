import fs from "fs";
import path from "path";
import matter from "gray-matter";
import bundledContent from "@/data/content.generated.json";

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

interface ContentSource {
  filename: string;
  source: string;
}

// Production reads the snapshot written by scripts/bundle-content.mjs, since
// src/content isn't on disk in serverless runtimes like Cloudflare Workers.
// Dev reads the files directly so markdown edits show up without a rebuild.
const readSources = (type: ContentType): ContentSource[] => {
  if (process.env.NODE_ENV !== "development") {
    return bundledContent[type];
  }

  const typeDir = path.join(contentDirectory, type);

  if (!fs.existsSync(typeDir)) {
    return [];
  }

  return fs
    .readdirSync(typeDir)
    .filter((file) => file.endsWith(markdownExtension))
    .map((filename) => ({
      filename,
      source: fs.readFileSync(path.join(typeDir, filename), "utf8"),
    }));
};

export const getContent = (type: ContentType): ContentItem[] => {
  const items = readSources(type).map(({ filename, source }) => {
    const { data, content } = matter(source);
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

export const getWorkContent = (): ContentItem[] => {
  const work = getContent("work");
  const explorations = getContent("explorations");
  const items = [...work, ...explorations];
  return items.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
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
  const items = getContent(type);
  return items.find((item) => item.slug === slug);
};

export const getAllSlugs = (type: ContentType): string[] => {
  const items = getContent(type);
  return items.map((item) => item.slug);
};

