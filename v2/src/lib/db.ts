import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

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

export interface ContentRecord {
  type: string;
  slug: string;
  title: string;
  date: string;
  description: string;
  cover_image: string | null;
  banner_image: string | null;
  tags: string | null;
  button_text: string | null;
  button_link: string | null;
  layout: string | null;
  locked: number | null;
  content: string;
}

const dbPath = path.resolve(process.cwd(), "src/data/content.db");

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbInstance = new Database(dbPath);
    dbInstance.pragma("journal_mode = WAL");
    initSchema(dbInstance);
  }
  return dbInstance;
}

export function initSchema(db: Database.Database = getDb()): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS content (
      type TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      cover_image TEXT,
      banner_image TEXT,
      tags TEXT,
      button_text TEXT,
      button_link TEXT,
      layout TEXT DEFAULT 'default',
      locked INTEGER DEFAULT 0,
      content TEXT NOT NULL,
      PRIMARY KEY (type, slug)
    );
  `);
}

export function rowToContentItem(row: ContentRecord): ContentItem {
  let tags: string[] = [];
  if (row.tags) {
    try {
      tags = JSON.parse(row.tags);
    } catch {
      tags = [];
    }
  }

  return {
    slug: row.slug,
    type: row.type as ContentType,
    title: row.title,
    date: row.date,
    description: row.description,
    coverImage: row.cover_image ?? undefined,
    bannerImage: row.banner_image ?? undefined,
    tags,
    buttonText: row.button_text ?? undefined,
    buttonLink: row.button_link ?? undefined,
    layout: row.layout === "full" ? "full" : "default",
    locked: row.locked === 1,
    content: row.content,
  };
}

export function insertOrUpdateContent(
  item: ContentItem,
  db: Database.Database = getDb(),
): void {
  const stmt = db.prepare(`
    INSERT INTO content (
      type, slug, title, date, description, cover_image, banner_image,
      tags, button_text, button_link, layout, locked, content
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(type, slug) DO UPDATE SET
      title = excluded.title,
      date = excluded.date,
      description = excluded.description,
      cover_image = excluded.cover_image,
      banner_image = excluded.banner_image,
      tags = excluded.tags,
      button_text = excluded.button_text,
      button_link = excluded.button_link,
      layout = excluded.layout,
      locked = excluded.locked,
      content = excluded.content
  `);

  stmt.run(
    item.type,
    item.slug,
    item.title,
    item.date,
    item.description,
    item.coverImage ?? null,
    item.bannerImage ?? null,
    JSON.stringify(item.tags ?? []),
    item.buttonText ?? null,
    item.buttonLink ?? null,
    item.layout ?? "default",
    item.locked ? 1 : 0,
    item.content,
  );
}

export function getContentByType(type: string): ContentItem[] {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM content WHERE type = ? ORDER BY date DESC",
  );
  const rows = stmt.all(type) as ContentRecord[];
  return rows.map(rowToContentItem);
}

export function getContentBySlug(
  type: string,
  slug: string,
): ContentItem | undefined {
  const db = getDb();
  const stmt = db.prepare(
    "SELECT * FROM content WHERE type = ? AND slug = ? LIMIT 1",
  );
  const row = stmt.get(type, slug) as ContentRecord | undefined;
  return row ? rowToContentItem(row) : undefined;
}

export function getAllSlugsByType(type: string): string[] {
  const db = getDb();
  const stmt = db.prepare("SELECT slug FROM content WHERE type = ?");
  const rows = stmt.all(type) as { slug: string }[];
  return rows.map((r) => r.slug);
}
