export type MediaItem = {
  id: string;
  key: string;
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
};

export const MEDIA_CDN_BASE = "https://cdn.barthkosi.com";

export function normalizeFolderPrefix(folder: string | null): string | null {
  if (!folder) return "";
  const trimmed = folder.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "";
  if (trimmed.includes("..") || trimmed.includes("\\")) {
    return null;
  }
  return `${trimmed}/`;
}

export function buildMediaUrl(key: string): string {
  const encodedPath = key.split("/").map(encodeURIComponent).join("/");
  return `${MEDIA_CDN_BASE}/${encodedPath}`;
}

export function formatMediaAlt(key: string): string {
  const filename = key.split("/").pop() ?? key;
  const stem = filename.replace(/\.[^.]+$/, "");
  const label = stem
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
  return label || "Media";
}

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += String.fromCharCode(bytes[start + i]);
  }
  return result;
}

export function parseImageDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (bytes.length < 10) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // PNG
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    return width > 0 && height > 0 ? { width, height } : null;
  }

  // GIF
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    const width = view.getUint16(6, true);
    const height = view.getUint16(8, true);
    return width > 0 && height > 0 ? { width, height } : null;
  }

  // WebP
  if (
    bytes.length >= 30 &&
    readAscii(bytes, 0, 4) === "RIFF" &&
    readAscii(bytes, 8, 4) === "WEBP"
  ) {
    const chunk = readAscii(bytes, 12, 4);
    if (
      chunk === "VP8 " &&
      bytes[23] === 0x9d &&
      bytes[24] === 0x01 &&
      bytes[25] === 0x2a
    ) {
      const width = view.getUint16(26, true) & 0x3fff;
      const height = view.getUint16(28, true) & 0x3fff;
      return width > 0 && height > 0 ? { width, height } : null;
    }
    if (chunk === "VP8L" && bytes[20] === 0x2f) {
      const packed = view.getUint32(21, true);
      const width = (packed & 0x3fff) + 1;
      const height = ((packed >> 14) & 0x3fff) + 1;
      return width > 0 && height > 0 ? { width, height } : null;
    }
    if (chunk === "VP8X") {
      const width = (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1;
      const height = (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1;
      return width > 0 && height > 0 ? { width, height } : null;
    }
  }

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      while (offset < bytes.length && bytes[offset] !== 0xff) {
        offset += 1;
      }
      while (offset < bytes.length && bytes[offset] === 0xff) {
        offset += 1;
      }
      if (offset >= bytes.length) break;

      const marker = bytes[offset];
      offset += 1;

      if (
        marker === 0xd8 ||
        marker === 0xd9 ||
        marker === 0x01 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        continue;
      }

      if (offset + 2 > bytes.length) break;
      const segmentLength = view.getUint16(offset, false);
      if (segmentLength < 2) break;

      const isSof =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);

      if (isSof) {
        if (offset + 7 > bytes.length) break;
        const height = view.getUint16(offset + 3, false);
        const width = view.getUint16(offset + 5, false);
        return width > 0 && height > 0 ? { width, height } : null;
      }

      offset += segmentLength;
    }
  }

  // AVIF / HEIF (ISO BMFF ispe box)
  if (bytes.length >= 24 && readAscii(bytes, 4, 4) === "ftyp") {
    const brand = readAscii(bytes, 8, 4);
    if (
      brand === "avif" ||
      brand === "avis" ||
      brand === "mif1" ||
      brand === "heic" ||
      brand === "heix"
    ) {
      for (let i = 16; i + 16 <= bytes.length; i += 1) {
        if (
          bytes[i] === 0x69 &&
          bytes[i + 1] === 0x73 &&
          bytes[i + 2] === 0x70 &&
          bytes[i + 3] === 0x65
        ) {
          const boxSize = view.getUint32(i - 4, false);
          if (boxSize >= 20 && boxSize <= 64) {
            const width = view.getUint32(i + 8, false);
            const height = view.getUint32(i + 12, false);
            if (width > 0 && width <= 65536 && height > 0 && height <= 65536) {
              return { width, height };
            }
          }
        }
      }
    }
  }

  return null;
}
