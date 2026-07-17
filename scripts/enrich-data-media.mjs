import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DATA_PATHS = [
  resolve("src/data/books.json"),
  resolve("src/data/illustrations.json"),
];
const CLOUDINARY_HOST = "res.cloudinary.com";

function parseCloudinaryPublicId(value) {
  const url = new URL(value);

  if (url.hostname !== CLOUDINARY_HOST) {
    throw new Error(`Expected a Cloudinary URL, received "${value}"`);
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const uploadIndex = parts.indexOf("upload");

  if (uploadIndex === -1) {
    throw new Error(`Missing Cloudinary upload segment in "${value}"`);
  }

  let assetParts = parts.slice(uploadIndex + 1);

  if (/^v\d+$/.test(assetParts[0])) {
    assetParts = assetParts.slice(1);
  }

  return decodeURIComponent(assetParts.join("/")).replace(/\.[^.]+$/, "");
}

function getJpegDimensions(buffer) {
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

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
  if (
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
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
  if (buffer[0] === 0xff && buffer[1] === 0xd8)
    return getJpegDimensions(buffer);

  return (
    getPngDimensions(buffer) ??
    getGifDimensions(buffer) ??
    getWebpDimensions(buffer)
  );
}

async function fetchImageDimensions(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Image fetch failed for "${url}" with status ${response.status}`,
    );
  }

  const dimensions = getImageDimensionsFromBuffer(
    Buffer.from(await response.arrayBuffer()),
  );

  if (!dimensions) {
    throw new Error(`Unsupported image format for "${url}"`);
  }

  return dimensions;
}

async function enrichItem(item) {
  const image = item.image;
  const publicId = item.publicId ?? parseCloudinaryPublicId(image);
  const dimensions =
    item.width && item.height
      ? { width: item.width, height: item.height }
      : await fetchImageDimensions(image);
  const mediaFields = {
    publicId,
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio: dimensions.height / dimensions.width,
  };

  if ("title" in item) {
    return {
      id: item.id,
      image,
      ...mediaFields,
      title: item.title,
      author: item.author,
      link: item.link,
      tags: item.tags,
    };
  }

  return {
    id: item.id,
    image,
    ...mediaFields,
  };
}

for (const dataPath of DATA_PATHS) {
  const items = JSON.parse(await readFile(dataPath, "utf8"));
  const enrichedItems = [];

  for (const item of items) {
    enrichedItems.push(await enrichItem(item));
  }

  await writeFile(
    dataPath,
    `${JSON.stringify(enrichedItems, null, 4)}\n`,
    "utf8",
  );
  console.log(`Wrote ${enrichedItems.length} enriched items to ${dataPath}`);
}
