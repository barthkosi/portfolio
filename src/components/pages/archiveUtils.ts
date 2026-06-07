import Konva from "konva";

/* -------------------------------------------------------------------------- */
/*                                    Config                                  */
/* -------------------------------------------------------------------------- */

export const GAP = 24;
export const DESKTOP_ITEM_WIDTH = 400;
export const MOBILE_ITEM_WIDTH = 200;
export const MOBILE_BREAKPOINT = 768;

export const DESKTOP_MIN_SCALE = 0.5;
export const MOBILE_MIN_VISIBLE_COLUMNS = 7;
export const MOBILE_MIN_SCALE_FLOOR = 0.2;
export const MAX_SCALE = 1.5;

export const DRAG_DECELERATION = 0.95;
export const TAPPING_DECELERATION = 0.75;
export const WHEEL_IMPULSE = 0.18;
export const CLICK_MOVE_THRESHOLD = 6;
export const OPEN_CENTER_THRESHOLD = 24;
export const OPEN_AFTER_CENTER_DELAY = 420;

export const TRACKPAD_ZOOM_SENSITIVITY = 0.0015;
export const TRACKPAD_PINCH_ZOOM_SENSITIVITY = 0.012;
export const TOUCH_PINCH_SENSITIVITY = 1.35;
export const SCALE_EASING = 0.36;
export const TRACKPAD_PINCH_END_DELAY = 120;

export const LAZY_LOAD_OVERSCAN = 1200;
export const MAX_CONCURRENT_IMAGE_LOADS = 4;
export const INTERACTION_CONCURRENT_IMAGE_LOADS = 2;
export const MAX_KONVA_PIXEL_RATIO = 1.5;
export const IMAGE_LOAD_START_DELAY = 40;
export const IMAGE_LOAD_RESUME_DELAY = 80;
export const ARCHIVE_IMAGE_MIN_WIDTH = 640;
export const ARCHIVE_IMAGE_MAX_WIDTH = 1200;
export const CONTEXT_IMAGE_SRC_ATTRIBUTE = "data-context-image-src";

export const CURSOR_GRAB = "url('/cursors/Cursor Grab.png') 12 12, grab";
export const CURSOR_GRABBED =
    "url('/cursors/Cursor Grabbed.png') 12 12, grabbing";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type Point = {
    x: number;
    y: number;
};

export type ArchiveItem = {
    id: string;
    image: string;
    publicId: string;
    width: number;
    height: number;
    aspectRatio: number;
    color: string;
};

export type Tile = {
    item: ArchiveItem;
    placeholder: Konva.Rect;
    imageNode: Konva.Image | null;
    imageElement: HTMLImageElement | null;
    loadState: "idle" | "queued" | "loading" | "loaded" | "error";
    generation: number;
    baseX: number;
    baseY: number;
    width: number;
    height: number;
    colIndex: number;
    renderedX: number | null;
    renderedY: number | null;
    renderedScale: number | null;
};

export type LoadCandidate = {
    tile: Tile;
    distanceFromCenter: number;
};

export type ActiveArchiveTile = {
    image: string;
    previewImage: string;
    x: number;
    y: number;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
};

export type OpenArchiveImage = {
    image: string;
    previewImage: string;
    origin: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    naturalWidth: number;
    naturalHeight: number;
};

export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

/* -------------------------------------------------------------------------- */
/*                                  Utilities                                 */
/* -------------------------------------------------------------------------- */

export const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

export const positiveModulo = (value: number, divisor: number) => {
    const remainder = value % divisor;
    return remainder < 0 ? remainder + divisor : remainder;
};

export const getItemWidth = () =>
    window.innerWidth < MOBILE_BREAKPOINT
        ? MOBILE_ITEM_WIDTH
        : DESKTOP_ITEM_WIDTH;

export const getMinScale = (itemWidth: number) => {
    if (window.innerWidth >= MOBILE_BREAKPOINT) {
        return DESKTOP_MIN_SCALE;
    }

    const scaleForSevenColumns =
        window.innerWidth / ((itemWidth + GAP) * MOBILE_MIN_VISIBLE_COLUMNS);

    return clamp(scaleForSevenColumns, MOBILE_MIN_SCALE_FLOOR, DESKTOP_MIN_SCALE);
};

export const getShortestColumnIndex = (heights: number[]) => {
    let shortestIndex = 0;

    for (let index = 1; index < heights.length; index++) {
        if (heights[index] < heights[shortestIndex]) {
            shortestIndex = index;
        }
    }

    return shortestIndex;
};

export const getTouchDistance = (touches: TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;

    return Math.hypot(dx, dy);
};

export const getTouchCenter = (touches: TouchList): Point => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
});

export const isMultiTouchEvent = (event: MouseEvent | TouchEvent) =>
    "touches" in event && event.touches.length > 1;

export const isTouchEvent = (event: MouseEvent | TouchEvent): event is TouchEvent =>
    "touches" in event;

export const isolateTouchEvent = (event: TouchEvent) => {
    if (event.cancelable) {
        event.preventDefault();
    }

    event.stopPropagation();
};

export const stopTouchPropagation = (event: TouchEvent) => {
    event.stopPropagation();
};

export const normalizeWheelDelta = (
    delta: number,
    deltaMode: number,
    pageSize: number
) => {
    switch (deltaMode) {
        case WheelEvent.DOM_DELTA_LINE:
            return delta * 16;
        case WheelEvent.DOM_DELTA_PAGE:
            return delta * pageSize;
        default:
            return delta;
    }
};

export const intersectsViewport = (
    x: number,
    y: number,
    width: number,
    height: number,
    viewportWidth: number,
    viewportHeight: number
) =>
    x + width >= -LAZY_LOAD_OVERSCAN &&
    x <= viewportWidth + LAZY_LOAD_OVERSCAN &&
    y + height >= -LAZY_LOAD_OVERSCAN &&
    y <= viewportHeight + LAZY_LOAD_OVERSCAN;

export const getOptimizedImageSrc = (src: string, width: number) => {
    const uploadSegment = "/image/upload/";
    const uploadIndex = src.indexOf(uploadSegment);

    if (uploadIndex === -1) return src;

    const insertIndex = uploadIndex + uploadSegment.length;
    const transformation = `f_auto,q_auto,w_${width},c_limit`;

    return `${src.slice(0, insertIndex)}${transformation}/${src.slice(insertIndex)}`;
};

export const getImageRequestWidth = (itemWidth: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_KONVA_PIXEL_RATIO);
    const requestedWidth = Math.ceil((itemWidth * MAX_SCALE * dpr) / 100) * 100;

    return clamp(
        requestedWidth,
        ARCHIVE_IMAGE_MIN_WIDTH,
        ARCHIVE_IMAGE_MAX_WIDTH
    );
};

export const getContainedRect = (
    contentWidth: number,
    contentHeight: number,
    viewportWidth: number,
    viewportHeight: number
): Rect => {
    const marginX = viewportWidth < MOBILE_BREAKPOINT ? 0 : 70;
    const marginY = viewportWidth < MOBILE_BREAKPOINT ? 0 : 40;
    const availableWidth = Math.max(1, viewportWidth - marginX * 2);
    const availableHeight = Math.max(1, viewportHeight - marginY * 2);
    const scale = Math.min(
        availableWidth / contentWidth,
        availableHeight / contentHeight
    );
    const width = contentWidth * scale;
    const height = contentHeight * scale;

    return {
        x: (viewportWidth - width) / 2,
        y: (viewportHeight - height) / 2,
        width,
        height,
    };
};
