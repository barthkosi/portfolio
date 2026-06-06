const CLOUDINARY_IMAGE_UPLOAD_SEGMENT = "/image/upload/";
const CLOUDINARY_VIDEO_UPLOAD_SEGMENT = "/video/upload/";
const NEXT_IMAGE_OPTIMIZER_PATH = "/_next/image";

const safeDecode = (value: string) => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

export function isCloudinaryImageUrl(src: string) {
    try {
        const url = new URL(src);

        return (
            url.hostname === "res.cloudinary.com" &&
            url.pathname.includes(CLOUDINARY_IMAGE_UPLOAD_SEGMENT)
        );
    } catch {
        return false;
    }
}

export function isCloudinaryVideoUrl(src: string) {
    try {
        const url = new URL(src);

        return (
            url.hostname === "res.cloudinary.com" &&
            url.pathname.includes(CLOUDINARY_VIDEO_UPLOAD_SEGMENT)
        );
    } catch {
        return false;
    }
}

export function getCloudinaryResponsiveImageSrc(src: string, width: number) {
    const uploadIndex = src.indexOf(CLOUDINARY_IMAGE_UPLOAD_SEGMENT);

    if (uploadIndex === -1) {
        return src;
    }

    const insertIndex = uploadIndex + CLOUDINARY_IMAGE_UPLOAD_SEGMENT.length;
    const requestedWidth = Math.max(1, Math.round(width));
    const transformation = `f_auto,q_auto:best,w_${requestedWidth},c_limit`;

    return `${src.slice(0, insertIndex)}${transformation}/${src.slice(insertIndex)}`;
}

export function getCloudinaryOptimizedVideoSrc(src: string) {
    const uploadIndex = src.indexOf(CLOUDINARY_VIDEO_UPLOAD_SEGMENT);

    if (uploadIndex === -1) {
        return src;
    }

    const transformation = "f_auto,q_auto:eco,vc_auto";
    if (src.includes(transformation)) {
        return src;
    }

    const insertIndex = uploadIndex + CLOUDINARY_VIDEO_UPLOAD_SEGMENT.length;

    return `${src.slice(0, insertIndex)}${transformation}/${src.slice(insertIndex)}`;
}

export function getCloudinaryVideoThumbnailSrc(src: string, width = 1200) {
    const uploadIndex = src.indexOf(CLOUDINARY_VIDEO_UPLOAD_SEGMENT);

    if (uploadIndex === -1) {
        return src;
    }

    const insertIndex = uploadIndex + CLOUDINARY_VIDEO_UPLOAD_SEGMENT.length;
    const requestedWidth = Math.max(1, Math.round(width));
    const transformation = `so_1,w_${requestedWidth},c_limit,f_jpg,q_auto:best`;
    const assetPath = src.slice(insertIndex).replace(/\.(mp4|webm|ogg|mov|avi|ogv)(?=([?#]|$))/i, ".jpg");

    return `${src.slice(0, insertIndex)}${transformation}/${assetPath}`;
}

export function getOriginalImageSource(src: string, baseUrl?: string) {
    const trimmedSrc = src.trim();

    if (!trimmedSrc) {
        return trimmedSrc;
    }

    try {
        const url = new URL(trimmedSrc, baseUrl);
        const originalUrl = url.searchParams.get("url");

        if (url.pathname === NEXT_IMAGE_OPTIMIZER_PATH && originalUrl) {
            return originalUrl;
        }
    } catch {
        return trimmedSrc;
    }

    return trimmedSrc;
}

export function getImageFileName(src: string, fallback = "download") {
    const originalSrc = getOriginalImageSource(src, "https://example.com");

    try {
        const url = new URL(originalSrc, "https://example.com");
        const fileName = url.pathname.split("/").filter(Boolean).pop();

        return fileName ? safeDecode(fileName) : fallback;
    } catch {
        const fileName = originalSrc.split(/[?#]/)[0].split("/").filter(Boolean).pop();

        return fileName ? safeDecode(fileName) : fallback;
    }
}
