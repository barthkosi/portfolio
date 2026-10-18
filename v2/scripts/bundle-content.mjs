// Snapshots src/content into a JSON module so content ships inside the server
// bundle. Runtimes without a real filesystem (Cloudflare Workers via OpenNext)
// can't read src/content at request time.
import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const CONTENT_PATH = resolve("src/content");
const OUTPUT_PATH = resolve("src/data/content.generated.json");
const CONTENT_TYPES = ["work", "writing", "explorations"];
const MARKDOWN_EXTENSION = ".md";

async function readType(type) {
  const directory = join(CONTENT_PATH, type);

  if (!existsSync(directory)) return [];

  const filenames = (await readdir(directory))
    .filter((file) => file.endsWith(MARKDOWN_EXTENSION))
    .sort();

  return Promise.all(
    filenames.map(async (filename) => ({
      filename,
      source: await readFile(join(directory, filename), "utf8"),
    })),
  );
}

const output = {};

for (const type of CONTENT_TYPES) {
  output[type] = await readType(type);
}

await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);

const counts = CONTENT_TYPES.map((type) => `${type}: ${output[type].length}`);
console.log(`Bundled content (${counts.join(", ")}) -> ${OUTPUT_PATH}`);
