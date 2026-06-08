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

        // Filter out any transformation segments.
        assetParts = assetParts.filter(part => {
            if (/^v\d+$/.test(part)) return true;
            const transformParams = ['w_', 'h_', 'c_', 'f_', 'q_', 'so_', 'co_', 'e_', 'fl_', 'pg_', 'bo_', 'b_', 'a_', 'o_', 'r_'];
            const isTransform = transformParams.some(param => part.startsWith(param) || part.includes(',' + param)) || 
                part.includes(',w_') || part.includes(',h_') || part.includes(',c_') || part.includes(',f_') || part.includes(',q_') || part.includes(',so_');
            return !isTransform;
        });

        if (/^v\d+$/.test(assetParts[0])) {
            assetParts = assetParts.slice(1);
        }

        const publicId = decodeURIComponent(assetParts.join("/")).replace(/\.[^.]+$/, "");

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

function getJpegDimensions(buffer) {
    let offset = 2;

    while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) return null;

        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

        if (isStartOfFrame) {
            return {
                height: buffer.readUInt16BE(offset + 5),
                width: buffer.readUInt16BE(offset + 7),
            };
        }

        offset += 2 + length;
    }

    return null;
}

function getPngDimensions(buffer) {
    if (buffer.toString("ascii", 1, 4) !== "PNG") return null;

    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    };
}

function getGifDimensions(buffer) {
    if (buffer.toString("ascii", 0, 3) !== "GIF") return null;

    return {
        width: buffer.readUInt16LE(6),
        height: buffer.readUInt16LE(8),
    };
}

function getWebpDimensions(buffer) {
    if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
        return null;
    }

    const chunkType = buffer.toString("ascii", 12, 16);

    if (chunkType === "VP8X") {
        return {
            width: 1 + buffer.readUIntLE(24, 3),
            height: 1 + buffer.readUIntLE(27, 3),
        };
    }

    if (chunkType === "VP8 ") {
        return {
            width: buffer.readUInt16LE(26) & 0x3fff,
            height: buffer.readUInt16LE(28) & 0x3fff,
        };
    }

    if (chunkType === "VP8L") {
        const bits = buffer.readUInt32LE(21);

        return {
            width: (bits & 0x3fff) + 1,
            height: ((bits >> 14) & 0x3fff) + 1,
        };
    }

    return null;
}

function getImageDimensionsFromBuffer(buffer) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return getJpegDimensions(buffer);

    return getPngDimensions(buffer) ?? getGifDimensions(buffer) ?? getWebpDimensions(buffer);
}

async function fetchImageDimensionsFromUrl(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Image fetch failed with status ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const dimensions = getImageDimensionsFromBuffer(buffer);

    if (!dimensions) {
        throw new Error("Unsupported image format for direct dimension probing");
    }

    return dimensions;
}

function isRateLimited(error) {
    return error?.http_code === 420 || error?.error?.http_code === 420;
}

function loadExistingMediaEntries() {
    if (!existsSync(OUTPUT_PATH)) return {};

    return JSON.parse(readFileSync(OUTPUT_PATH, "utf8"));
}

async function fetchAssetDimensions(url, existingMediaEntries) {
    const existingEntry = existingMediaEntries[url];

    if (existingEntry) {
        return existingEntry;
    }

    const assetRef = parseCloudinaryAssetUrl(url);

    if (!assetRef) {
        return null;
    }

    if (assetRef.resourceType === "image") {
        try {
            const dimensions = await fetchImageDimensionsFromUrl(url);

            return {
                publicId: assetRef.publicId,
                resourceType: assetRef.resourceType,
                width: dimensions.width,
                height: dimensions.height,
                aspectRatio: `${dimensions.width}/${dimensions.height}`,
            };
        } catch (error) {
            console.warn(`Direct image probe failed for ${url}`, error);
        }
    }

    let asset;

    try {
        asset = await cloudinary.api.resource(assetRef.publicId, {
            resource_type: assetRef.resourceType,
        });
    } catch (error) {
        if (isRateLimited(error)) {
            throw new Error(`Cloudinary Admin API rate limited and no cached metadata exists for "${url}"`);
        }

        throw error;
    }

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
    const existingMediaEntries = loadExistingMediaEntries();
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
            const dimensions = await fetchAssetDimensions(url, existingMediaEntries);

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
