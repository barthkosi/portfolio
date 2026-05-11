import { existsSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { v2 as cloudinary } from "cloudinary";

const ARCHIVE_PATH = resolve("src/data/archive.json");
const LOCAL_ENV_PATH = resolve(".env.local");
const FALLBACK_COLOR = "#111111";

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

loadLocalEnv();

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

cloudinary.config(getCloudinaryConfig());

function extractPublicIdFromCloudinaryUrl(url) {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);

    const uploadIndex = parts.indexOf("upload");

    if (uploadIndex === -1) {
        throw new Error(`Could not find "/upload/" in Cloudinary URL: ${url}`);
    }

    let assetParts = parts.slice(uploadIndex + 1);

    if (/^v\d+$/.test(assetParts[0])) {
        assetParts = assetParts.slice(1);
    }

    const assetPath = assetParts.join("/");

    return assetPath.replace(/\.[^.]+$/, "");
}

function normalizeHexColor(value) {
    if (!value || typeof value !== "string") {
        return FALLBACK_COLOR;
    }

    const hex = value.replace(/^#/, "");

    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
        return `#${hex.toLowerCase()}`;
    }

    if (/^[0-9a-fA-F]{8}$/.test(hex)) {
        return `#${hex.slice(0, 6).toLowerCase()}`;
    }

    return FALLBACK_COLOR;
}

function getPredominantColor(asset) {
    const firstColor = asset.colors?.[0];

    if (Array.isArray(firstColor)) {
        return normalizeHexColor(firstColor[0]);
    }

    return FALLBACK_COLOR;
}

async function enrichItem(item) {
    const publicId =
        item.publicId ?? extractPublicIdFromCloudinaryUrl(item.image);

    const asset = await cloudinary.api.resource(publicId, {
        resource_type: "image",
        colors: true,
    });

    if (!asset.width || !asset.height) {
        throw new Error(`Missing dimensions for Cloudinary asset "${publicId}"`);
    }

    return {
        id: item.id,
        image: item.image,
        publicId,
        width: asset.width,
        height: asset.height,
        aspectRatio: asset.height / asset.width,
        color: getPredominantColor(asset),
    };
}

async function main() {
    const raw = await readFile(ARCHIVE_PATH, "utf8");
    const items = JSON.parse(raw);

    const seenImages = new Set();

    const uniqueItems = items.filter((item) => {
        if (seenImages.has(item.image)) {
            console.warn(`Removing duplicate image URL: ${item.image}`);
            return false;
        }

        seenImages.add(item.image);
        return true;
    });

    const enrichedItems = [];
    const failedItems = [];

    for (const item of uniqueItems) {
        try {
            const enriched = await enrichItem(item);
            enrichedItems.push(enriched);
            console.log(`OK ${item.id}`);
        } catch (error) {
            failedItems.push(item.id);
            console.error(`Failed ${item.id}`, error);
        }
    }

    if (failedItems.length > 0) {
        throw new Error(
            `Archive enrichment failed for ${
                failedItems.length
            } item(s): ${failedItems.join(", ")}`
        );
    }

    await writeFile(
        ARCHIVE_PATH,
        `${JSON.stringify(enrichedItems, null, 4)}\n`,
        "utf8"
    );

    console.log(`\nWrote ${enrichedItems.length} enriched archive items.`);
}

await main();
