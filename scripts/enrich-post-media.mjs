import { existsSync, readFileSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { v2 as cloudinary } from "cloudinary";

const CONTENT_PATH = resolve("src/content");
const OUTPUT_PATH = resolve("src/data/post-media.json");
const LOCAL_ENV_PATH = resolve(".env.local");
const CLOUDINARY_HOST = "res.cloudinary.com";
const SUPPORTED_RESOURCE_TYPES = new Set(["image", "video"]);

function loadLocalEnv() {
    if (!existsSync(LOCAL_ENV_PATH)) return;

    const lines = readFileSync(LOCAL_ENV_PATH, "utf8").split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#")) continue;

        const separatorIndex = trimmed.indexOf("=");

        if (separatorIndex === -1) continue;

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim();

        process.env[key] ??= value.replace(/^["']|["']$/g, "");
    }
}

function getCloudinaryConfig() {
    const cloudinaryUrl = process.env.CLOUDINARY_URL;

    if (!cloudinaryUrl) {
        throw new Error(
            "Missing CLOUDINARY_URL. Add it to .env.local or export it before running this script."
        );
    }

    const parsed = new URL(cloudinaryUrl);

    return {
        cloud_name: parsed.hostname,
        api_key: decodeURIComponent(parsed.username),
        api_secret: decodeURIComponent(parsed.password),
        secure: true,
    };
}

function parseCloudinaryAssetUrl(value) {
    try {
        const url = new URL(value);
        const parts = url.pathname.split("/").filter(Boolean);
        const resourceType = parts[1];
        const uploadIndex = parts.indexOf("upload");

        if (
            url.hostname !== CLOUDINARY_HOST ||
            uploadIndex === -1 ||
            !SUPPORTED_RESOURCE_TYPES.has(resourceType)
        ) {
            return null;
        }

        let assetParts = parts.slice(uploadIndex + 1);

        if (/^v\d+$/.test(assetParts[0])) {
            assetParts = assetParts.slice(1);
        }

        const publicId = assetParts.join("/").replace(/\.[^.]+$/, "");

        return { publicId, resourceType };
    } catch {
        return null;
    }
}

async function getMarkdownFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
        entries.map((entry) => {
            const entryPath = join(directory, entry.name);

            if (entry.isDirectory()) {
                return getMarkdownFiles(entryPath);
            }

            return entry.isFile() && entry.name.endsWith(".md") ? [entryPath] : [];
        })
    );

    return files.flat();
}

function collectMediaUrls(fileContents) {
    const { data, content } = matter(fileContents);
    const urls = new Set();
    const frontmatterMediaKeys = ["coverImage", "bannerImage"];

    for (const key of frontmatterMediaKeys) {
        if (typeof data[key] === "string") {
            urls.add(data[key]);
        }
    }

    for (const match of content.matchAll(/!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
        urls.add(match[1]);
    }

    return Array.from(urls).filter((url) => parseCloudinaryAssetUrl(url));
}

async function fetchAssetDimensions(url) {
    const assetRef = parseCloudinaryAssetUrl(url);

    if (!assetRef) {
        return null;
    }

    const asset = await cloudinary.api.resource(assetRef.publicId, {
        resource_type: assetRef.resourceType,
    });

    if (!asset.width || !asset.height) {
        throw new Error(`Missing dimensions for Cloudinary asset "${assetRef.publicId}"`);
    }

    return {
        publicId: assetRef.publicId,
        resourceType: assetRef.resourceType,
        width: asset.width,
        height: asset.height,
        aspectRatio: `${asset.width}/${asset.height}`,
    };
}

async function main() {
    loadLocalEnv();
    cloudinary.config(getCloudinaryConfig());

    const markdownFiles = await getMarkdownFiles(CONTENT_PATH);
    const mediaUrls = new Set();

    for (const file of markdownFiles) {
        const fileContents = await readFile(file, "utf8");

        for (const url of collectMediaUrls(fileContents)) {
            mediaUrls.add(url);
        }
    }

    const mediaEntries = {};
    const failedUrls = [];

    for (const url of [...mediaUrls].sort()) {
        try {
            const dimensions = await fetchAssetDimensions(url);

            if (dimensions) {
                mediaEntries[url] = dimensions;
                console.log(`OK ${url}`);
            }
        } catch (error) {
            failedUrls.push(url);
            console.error(`Failed ${url}`, error);
        }
    }

    if (failedUrls.length > 0) {
        throw new Error(
            `Post media enrichment failed for ${failedUrls.length} URL(s): ${failedUrls.join(", ")}`
        );
    }

    await writeFile(OUTPUT_PATH, `${JSON.stringify(mediaEntries, null, 4)}\n`, "utf8");

    console.log(`\nWrote ${Object.keys(mediaEntries).length} enriched post media items.`);
}

await main();
