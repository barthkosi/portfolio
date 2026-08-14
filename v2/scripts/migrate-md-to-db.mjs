import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "../src/data/content.db");

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

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

const types = ["writing", "work", "explorations"];
const contentDir = path.resolve(__dirname, "../src/content");

let migratedCount = 0;

for (const type of types) {
  const typeDir = path.join(contentDir, type);
  if (!fs.existsSync(typeDir)) continue;

  const files = fs.readdirSync(typeDir).filter((f) => f.endsWith(".md"));
  for (const filename of files) {
    const filePath = path.join(typeDir, filename);
    const fileContents = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContents);
    const slug = filename.replace(/\.md$/, "");

    stmt.run(
      type,
      slug,
      data.title || "Untitled",
      data.date || new Date().toISOString(),
      data.description || "",
      data.coverImage || null,
      data.bannerImage || null,
      JSON.stringify(data.tags || []),
      data.buttonText || null,
      data.buttonLink || null,
      data.layout === "full" ? "full" : "default",
      data.locked === true ? 1 : 0,
      content || "",
    );
    migratedCount++;
  }
}

console.log(`Migrated ${migratedCount} markdown files into SQLite database.`);
