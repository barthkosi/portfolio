"use client";

import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import archiveData from "@/data/archive.json";

/* -------------------------------------------------------------------------- */
/*                                    Config                                  */
/* -------------------------------------------------------------------------- */

const GAP = 24;
const DESKTOP_ITEM_WIDTH = 400;
const MOBILE_ITEM_WIDTH = 200;
const MOBILE_BREAKPOINT = 768;

const DESKTOP_MIN_SCALE = 0.5;
const MOBILE_MIN_VISIBLE_COLUMNS = 7;
const MOBILE_MIN_SCALE_FLOOR = 0.2;
const MAX_SCALE = 1.5;

const DRAG_DECELERATION = 0.92;
const WHEEL_IMPULSE = 0.18;
const CLICK_MOVE_THRESHOLD = 6;

const TRACKPAD_ZOOM_SENSITIVITY = 0.0015;
const TRACKPAD_PINCH_ZOOM_SENSITIVITY = 0.012;
const TOUCH_PINCH_SENSITIVITY = 1.35;
const SCALE_EASING = 0.18;
const TRACKPAD_PINCH_END_DELAY = 120;

const LAZY_LOAD_OVERSCAN = 1200;
const MAX_CONCURRENT_IMAGE_LOADS = 4;
const INTERACTION_CONCURRENT_IMAGE_LOADS = 2;
const MAX_KONVA_PIXEL_RATIO = 1.5;
const IMAGE_LOAD_START_DELAY = 40;
const IMAGE_LOAD_RESUME_DELAY = 80;
const ARCHIVE_IMAGE_MIN_WIDTH = 640;
const ARCHIVE_IMAGE_MAX_WIDTH = 1200;
const CONTEXT_IMAGE_SRC_ATTRIBUTE = "data-context-image-src";

const CURSOR_GRAB = "url('/cursors/Cursor Grab.png') 12 12, grab";
const CURSOR_GRABBED =
    "url('/cursors/Cursor Grabbed.png') 12 12, grabbing";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type Point = {
    x: number;
    y: number;
};

type ArchiveItem = {
    id: string;
    image: string;
    publicId: string;
    width: number;
    height: number;
    aspectRatio: number;
    color: string;
};

type Tile = {
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

type LoadCandidate = {
    tile: Tile;
    distanceFromCenter: number;
};

const archive = archiveData as ArchiveItem[];
const archiveImageCache = new Map<string, Promise<HTMLImageElement>>();

/* -------------------------------------------------------------------------- */
/*                                  Utilities                                 */
/* -------------------------------------------------------------------------- */

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

const positiveModulo = (value: number, divisor: number) => {
    const remainder = value % divisor;
    return remainder < 0 ? remainder + divisor : remainder;
};

const getItemWidth = () =>
    window.innerWidth < MOBILE_BREAKPOINT
        ? MOBILE_ITEM_WIDTH
        : DESKTOP_ITEM_WIDTH;

const getMinScale = (itemWidth: number) => {
    if (window.innerWidth >= MOBILE_BREAKPOINT) {
        return DESKTOP_MIN_SCALE;
    }

    const scaleForSevenColumns =
        window.innerWidth / ((itemWidth + GAP) * MOBILE_MIN_VISIBLE_COLUMNS);

    return clamp(scaleForSevenColumns, MOBILE_MIN_SCALE_FLOOR, DESKTOP_MIN_SCALE);
};

const getShortestColumnIndex = (heights: number[]) => {
    let shortestIndex = 0;

    for (let index = 1; index < heights.length; index++) {
        if (heights[index] < heights[shortestIndex]) {
            shortestIndex = index;
        }
    }

    return shortestIndex;
};

const getTouchDistance = (touches: TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;

    return Math.hypot(dx, dy);
};

const getTouchCenter = (touches: TouchList): Point => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
});

const isMultiTouchEvent = (event: MouseEvent | TouchEvent) =>
    "touches" in event && event.touches.length > 1;

const isTouchEvent = (event: MouseEvent | TouchEvent): event is TouchEvent =>
    "touches" in event;

const isolateTouchEvent = (event: TouchEvent) => {
    if (event.cancelable) {
        event.preventDefault();
    }

    event.stopPropagation();
};

const stopTouchPropagation = (event: TouchEvent) => {
    event.stopPropagation();
};

const normalizeWheelDelta = (
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

const intersectsViewport = (
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

const getOptimizedImageSrc = (src: string, width: number) => {
    const uploadSegment = "/image/upload/";
    const uploadIndex = src.indexOf(uploadSegment);

    if (uploadIndex === -1) return src;

    const insertIndex = uploadIndex + uploadSegment.length;
    const transformation = `f_auto,q_auto,w_${width},c_limit`;

    return `${src.slice(0, insertIndex)}${transformation}/${src.slice(insertIndex)}`;
};

const getImageRequestWidth = (itemWidth: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_KONVA_PIXEL_RATIO);
    const requestedWidth = Math.ceil((itemWidth * MAX_SCALE * dpr) / 100) * 100;

    return clamp(
        requestedWidth,
        ARCHIVE_IMAGE_MIN_WIDTH,
        ARCHIVE_IMAGE_MAX_WIDTH
    );
};

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

export default function ArchiveContent() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [sceneReady, setSceneReady] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const previousPixelRatio = Konva.pixelRatio;
        Konva.pixelRatio = Math.min(
            window.devicePixelRatio || 1,
            MAX_KONVA_PIXEL_RATIO
        );

        let itemWidth = getItemWidth();
        let minScale = getMinScale(itemWidth);
        let imageRequestWidth = getImageRequestWidth(itemWidth);

        const stage = new Konva.Stage({
            container,
            width: window.innerWidth,
            height: window.innerHeight,
        });

        const layer = new Konva.Layer({ listening: false });
        stage.add(layer);

        const offset: Point = { x: 0, y: 0 };
        let velocity: Point = { x: 0, y: 0 };
        let momentumTargetOffset: Point | null = null;

        let scale = 1;
        let targetScale = 1;
        let zoomAnchorPoint: Point | null = null;

        let totalWidth = 0;
        let colHeights: number[] = [];

        const tiles: Tile[] = [];
        let tileGeneration = 0;
        let isMounted = true;

        let hasCenteredInitialView = false;
        let isDragging = false;
        let hasDraggedSincePointerStart = false;

        let lastPointer: Point = { x: 0, y: 0 };
        let pointerStart: Point = { x: 0, y: 0 };
        let animationFrameId: number | null = null;
        let renderFrameId: number | null = null;
        let sceneRevealFrameId: number | null = null;
        let sceneRevealSettleFrameId: number | null = null;

        let trackpadPinchStartScale = scale;
        let accumulatedTrackpadPinchDelta = 0;
        let trackpadPinchTimeout: ReturnType<typeof setTimeout> | null =
            null;
        let isControlKeyPressed = false;

        let pinchStartDistance = 0;
        let pinchStartScale = scale;

        const imageLoadQueue: Tile[] = [];
        let activeImageLoads = 0;
        let imageLoadTimer: ReturnType<typeof setTimeout> | null = null;
        let imageLoadResumeTimer: ReturnType<typeof setTimeout> | null = null;
        let isInteractionActive = false;
        let hasRevealedScene = false;

        /* ------------------------------------------------------------------ */
        /*                                Layout                              */
        /* ------------------------------------------------------------------ */

        const getRequiredColumnCount = () => {
            const visibleWidthAtMinScale = stage.width() / minScale;

            return Math.ceil(visibleWidthAtMinScale / (itemWidth + GAP)) + 2;
        };

        const getRequiredColumnHeight = () => {
            const visibleHeightAtMinScale = stage.height() / minScale;
            const tallestItemHeight = archive.reduce(
                (height, item) =>
                    Math.max(height, itemWidth * item.aspectRatio),
                0
            );

            return visibleHeightAtMinScale + tallestItemHeight + GAP * 4;
        };

        const clearTiles = () => {
            imageLoadQueue.length = 0;

            for (const tile of tiles) {
                tile.placeholder.destroy();
                tile.imageNode?.destroy();
            }

            tiles.length = 0;
        };

        const createTile = (item: ArchiveItem) => {
            const colIndex = getShortestColumnIndex(colHeights);
            const width = itemWidth;
            const height = width * item.aspectRatio;
            const baseX = colIndex * (itemWidth + GAP);
            const baseY = colHeights[colIndex];

            const placeholder = new Konva.Rect({
                x: baseX,
                y: baseY,
                width,
                height,
                fill: item.color || "#111111",
                listening: false,
                perfectDrawEnabled: false,
            });

            layer.add(placeholder);

            tiles.push({
                item,
                placeholder,
                imageNode: null,
                imageElement: null,
                loadState: "idle",
                generation: tileGeneration,
                baseX,
                baseY,
                width,
                height,
                colIndex,
                renderedX: null,
                renderedY: null,
                renderedScale: null,
            });

            colHeights[colIndex] += height + GAP;
        };

        const centerInitialView = () => {
            if (hasCenteredInitialView || tiles.length === 0) return;

            const firstTile = tiles[0];

            offset.x =
                stage.width() / (2 * scale) -
                firstTile.baseX -
                firstTile.width / 2;

            offset.y =
                stage.height() / (2 * scale) -
                firstTile.baseY -
                firstTile.height / 2;

            hasCenteredInitialView = true;
        };

        const revealScene = () => {
            if (hasRevealedScene) return;

            hasRevealedScene = true;

            sceneRevealFrameId = requestAnimationFrame(() => {
                sceneRevealFrameId = null;

                sceneRevealSettleFrameId = requestAnimationFrame(() => {
                    sceneRevealSettleFrameId = null;

                    if (isMounted) setSceneReady(true);
                });
            });
        };

        const buildTiles = () => {
            tileGeneration += 1;
            clearTiles();

            const columnCount = getRequiredColumnCount();

            totalWidth = columnCount * (itemWidth + GAP);
            colHeights = Array(columnCount).fill(0);

            if (archive.length > 0) {
                const requiredColumnHeight = getRequiredColumnHeight();

                while (
                    colHeights.some(
                        (columnHeight) =>
                            columnHeight < requiredColumnHeight
                    )
                ) {
                    for (const item of archive) {
                        createTile(item);
                    }
                }
            }

            centerInitialView();
            applyTransforms();
            revealScene();
        };

        /* ------------------------------------------------------------------ */
        /*                                Images                              */
        /* ------------------------------------------------------------------ */

        const loadImage = (src: string) => {
            const cached = archiveImageCache.get(src);

            if (cached) return cached;

            const promise = new Promise<HTMLImageElement>((resolve, reject) => {
                const image = new Image();

                image.decoding = "async";
                image.onload = () => {
                    const decode = image.decode?.();

                    if (!decode) {
                        resolve(image);
                        return;
                    }

                    decode
                        .catch(() => undefined)
                        .then(() => resolve(image));
                };
                image.onerror = reject;
                image.src = src;
            });

            archiveImageCache.set(src, promise);
            return promise;
        };

        const loadTileImage = async (tile: Tile) => {
            if (tile.loadState !== "queued") return;

            tile.loadState = "loading";
            const generation = tile.generation;

            try {
                const image = await loadImage(
                    getOptimizedImageSrc(tile.item.image, imageRequestWidth)
                );

                if (!isMounted || generation !== tileGeneration) return;

                tile.imageElement = image;
                tile.imageNode = new Konva.Image({
                    image,
                    x: tile.renderedX ?? 0,
                    y: tile.renderedY ?? 0,
                    width: tile.width,
                    height: tile.height,
                    scaleX: tile.renderedScale ?? scale,
                    scaleY: tile.renderedScale ?? scale,
                    opacity: 0,
                    listening: false,
                    perfectDrawEnabled: false,
                });

                layer.add(tile.imageNode);
                tile.loadState = "loaded";

                tile.imageNode.to({
                    opacity: 1,
                    duration: 0.18,
                });

                requestRender();
            } catch {
                if (!isMounted || generation !== tileGeneration) return;

                tile.loadState = "error";
            }
        };

        const getTileDistanceFromViewportCenter = (tile: Tile) => {
            if (
                tile.renderedX === null ||
                tile.renderedY === null ||
                tile.renderedScale === null
            ) {
                return Number.POSITIVE_INFINITY;
            }

            const viewportCenterX = stage.width() / 2;
            const viewportCenterY = stage.height() / 2;
            const screenWidth = tile.width * tile.renderedScale;
            const screenHeight = tile.height * tile.renderedScale;

            return Math.hypot(
                tile.renderedX + screenWidth / 2 - viewportCenterX,
                tile.renderedY + screenHeight / 2 - viewportCenterY
            );
        };

        const sortImageLoadQueue = () => {
            imageLoadQueue.sort(
                (a, b) =>
                    getTileDistanceFromViewportCenter(a) -
                    getTileDistanceFromViewportCenter(b)
            );
        };

        const getImageLoadLimit = () =>
            isInteractionActive
                ? INTERACTION_CONCURRENT_IMAGE_LOADS
                : MAX_CONCURRENT_IMAGE_LOADS;

        const processImageLoadQueue = () => {
            const imageLoadLimit = getImageLoadLimit();

            if (activeImageLoads >= imageLoadLimit) return;

            sortImageLoadQueue();

            while (
                activeImageLoads < imageLoadLimit &&
                imageLoadQueue.length > 0
            ) {
                const tile = imageLoadQueue.shift();

                if (!tile) continue;

                if (
                    !isMounted ||
                    tile.generation !== tileGeneration ||
                    tile.loadState !== "queued"
                ) {
                    continue;
                }

                activeImageLoads += 1;

                void loadTileImage(tile).finally(() => {
                    activeImageLoads -= 1;
                    processImageLoadQueue();
                });
            }
        };

        const scheduleImageLoadProcessing = () => {
            if (imageLoadTimer !== null) return;

            imageLoadTimer = setTimeout(() => {
                imageLoadTimer = null;
                processImageLoadQueue();
            }, IMAGE_LOAD_START_DELAY);
        };

        const queueTileImages = (candidates: LoadCandidate[]) => {
            if (candidates.length === 0) return;

            candidates.sort(
                (a, b) => a.distanceFromCenter - b.distanceFromCenter
            );

            for (const { tile } of candidates) {
                if (tile.loadState !== "idle") continue;

                tile.loadState = "queued";
                imageLoadQueue.push(tile);
            }

            sortImageLoadQueue();
            scheduleImageLoadProcessing();
        };

        /* ------------------------------------------------------------------ */
        /*                              Rendering                             */
        /* ------------------------------------------------------------------ */

        const applyTransforms = () => {
            const viewportWidth = stage.width();
            const viewportHeight = stage.height();
            const viewportCenterX = viewportWidth / 2;
            const viewportCenterY = viewportHeight / 2;
            const loadCandidates: LoadCandidate[] = [];

            for (const tile of tiles) {
                const {
                    placeholder,
                    imageNode,
                    baseX,
                    baseY,
                    width,
                    height,
                    colIndex,
                } = tile;

                const colHeight = colHeights[colIndex];

                if (!colHeight) continue;

                let x = positiveModulo(baseX + offset.x, totalWidth);
                let y = positiveModulo(baseY + offset.y, colHeight);

                if (x > totalWidth - width) x -= totalWidth;
                if (y > colHeight - height) y -= colHeight;

                const screenX = x * scale;
                const screenY = y * scale;
                const screenWidth = width * scale;
                const screenHeight = height * scale;

                const hasMoved =
                    tile.renderedX !== screenX || tile.renderedY !== screenY;
                const hasScaled = tile.renderedScale !== scale;

                if (hasMoved) {
                    const position = {
                        x: screenX,
                        y: screenY,
                    };

                    placeholder.position(position);

                    if (imageNode) {
                        imageNode.position(position);
                    }
                }

                if (hasScaled) {
                    const nodeScale = {
                        x: scale,
                        y: scale,
                    };

                    placeholder.scale(nodeScale);

                    if (imageNode) {
                        imageNode.scale(nodeScale);
                    }
                }

                tile.renderedX = screenX;
                tile.renderedY = screenY;
                tile.renderedScale = scale;

                if (
                    tile.loadState === "idle" &&
                    intersectsViewport(
                        screenX,
                        screenY,
                        screenWidth,
                        screenHeight,
                        viewportWidth,
                        viewportHeight
                    )
                ) {
                    loadCandidates.push({
                        tile,
                        distanceFromCenter: Math.hypot(
                            screenX + screenWidth / 2 - viewportCenterX,
                            screenY + screenHeight / 2 - viewportCenterY
                        ),
                    });
                }
            }

            queueTileImages(loadCandidates);
            layer.batchDraw();
        };

        const requestRender = () => {
            if (renderFrameId !== null) return;

            renderFrameId = requestAnimationFrame(() => {
                renderFrameId = null;
                applyTransforms();
            });
        };

        const zoomToPoint = (nextScale: number, point: Point) => {
            offset.x += point.x * (1 / nextScale - 1 / scale);
            offset.y += point.y * (1 / nextScale - 1 / scale);
            scale = nextScale;
        };

        const getPointerZoomPoint = (): Point =>
            stage.getPointerPosition() ?? {
                x: stage.width() / 2,
                y: stage.height() / 2,
            };

        const getZoomPoint = (): Point =>
            zoomAnchorPoint ?? getPointerZoomPoint();

        const getTileAtPoint = (point: Point) => {
            for (let index = tiles.length - 1; index >= 0; index--) {
                const tile = tiles[index];

                if (
                    tile.renderedX === null ||
                    tile.renderedY === null ||
                    tile.renderedScale === null
                ) {
                    continue;
                }

                const screenWidth = tile.width * tile.renderedScale;
                const screenHeight = tile.height * tile.renderedScale;

                if (
                    point.x >= tile.renderedX &&
                    point.x <= tile.renderedX + screenWidth &&
                    point.y >= tile.renderedY &&
                    point.y <= tile.renderedY + screenHeight
                ) {
                    return tile;
                }
            }

            return null;
        };

        const centerTile = (tile: Tile) => {
            if (
                tile.renderedX === null ||
                tile.renderedY === null ||
                tile.renderedScale === null
            ) {
                return;
            }

            const tileCenterX =
                tile.renderedX + (tile.width * tile.renderedScale) / 2;
            const tileCenterY =
                tile.renderedY + (tile.height * tile.renderedScale) / 2;
            const nextOffset = {
                x: offset.x + (stage.width() / 2 - tileCenterX) / scale,
                y: offset.y + (stage.height() / 2 - tileCenterY) / scale,
            };
            const dx = nextOffset.x - offset.x;
            const dy = nextOffset.y - offset.y;
            const impulseScale = (1 - DRAG_DECELERATION) / DRAG_DECELERATION;

            pauseImageLoading();
            stopAnimation();
            zoomAnchorPoint = null;
            momentumTargetOffset = nextOffset;
            velocity = {
                x: dx * impulseScale,
                y: dy * impulseScale,
            };
            startAnimation();
        };

        /* ------------------------------------------------------------------ */
        /*                              Animation                             */
        /* ------------------------------------------------------------------ */

        const animate = () => {
            let shouldContinue = false;

            if (Math.abs(targetScale - scale) > 0.0001) {
                const nextScale =
                    scale + (targetScale - scale) * SCALE_EASING;

                zoomToPoint(nextScale, getZoomPoint());
                shouldContinue = true;
            }

            if (
                Math.abs(velocity.x) >= 0.01 ||
                Math.abs(velocity.y) >= 0.01
            ) {
                velocity.x *= DRAG_DECELERATION;
                velocity.y *= DRAG_DECELERATION;

                offset.x += velocity.x;
                offset.y += velocity.y;

                shouldContinue = true;
            } else {
                velocity = { x: 0, y: 0 };

                if (momentumTargetOffset) {
                    offset.x = momentumTargetOffset.x;
                    offset.y = momentumTargetOffset.y;
                    momentumTargetOffset = null;
                }
            }

            applyTransforms();

            if (!shouldContinue) {
                zoomAnchorPoint = null;
                resumeImageLoadingSoon();
            }

            animationFrameId = shouldContinue
                ? requestAnimationFrame(animate)
                : null;
        };

        const startAnimation = () => {
            if (animationFrameId !== null) return;
            animationFrameId = requestAnimationFrame(animate);
        };

        const stopAnimation = () => {
            if (animationFrameId === null) return;

            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        };

        const pauseImageLoading = () => {
            isInteractionActive = true;

            if (imageLoadResumeTimer !== null) {
                clearTimeout(imageLoadResumeTimer);
                imageLoadResumeTimer = null;
            }
        };

        const resumeImageLoadingSoon = () => {
            if (imageLoadResumeTimer !== null) {
                clearTimeout(imageLoadResumeTimer);
            }

            imageLoadResumeTimer = setTimeout(() => {
                imageLoadResumeTimer = null;
                isInteractionActive = false;
                scheduleImageLoadProcessing();
            }, IMAGE_LOAD_RESUME_DELAY);
        };

        /* ------------------------------------------------------------------ */
        /*                                Input                               */
        /* ------------------------------------------------------------------ */

        function handlePinchMove(event: TouchEvent) {
            isolateTouchEvent(event);

            if (event.touches.length !== 2) return;

            pauseImageLoading();
            stopAnimation();
            momentumTargetOffset = null;
            velocity = { x: 0, y: 0 };
            isDragging = false;

            const distance = getTouchDistance(event.touches);

            if (!pinchStartDistance) {
                pinchStartDistance = distance;
                pinchStartScale = targetScale;
                zoomAnchorPoint = getTouchCenter(event.touches);
                return;
            }

            const gestureRatio = distance / pinchStartDistance;

            const nextScale = clamp(
                pinchStartScale *
                    Math.pow(gestureRatio, TOUCH_PINCH_SENSITIVITY),
                minScale,
                MAX_SCALE
            );

            targetScale = nextScale;
            zoomAnchorPoint = getTouchCenter(event.touches);
            startAnimation();
        }

        function handlePinchEnd() {
            pinchStartDistance = 0;
            pinchStartScale = targetScale;
            startAnimation();
        }

        const handlePointerStart = (
            event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
        ) => {
            if (event.evt instanceof MouseEvent && event.evt.button !== 0) {
                return;
            }

            if (isTouchEvent(event.evt)) {
                stopTouchPropagation(event.evt);
            }

            if (isMultiTouchEvent(event.evt)) {
                isDragging = false;
                return;
            }

            pauseImageLoading();
            isDragging = true;
            hasDraggedSincePointerStart = false;
            zoomAnchorPoint = null;
            stopAnimation();
            momentumTargetOffset = null;

            const pointer = stage.getPointerPosition();
            if (!pointer) return;

            lastPointer = pointer;
            pointerStart = pointer;
            velocity = { x: 0, y: 0 };

            container.style.cursor = CURSOR_GRABBED;
        };

        const handlePointerMove = (
            event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
        ) => {
            if (isTouchEvent(event.evt)) {
                if (isMultiTouchEvent(event.evt)) {
                    handlePinchMove(event.evt);
                    return;
                }

                isolateTouchEvent(event.evt);
            }

            if (!isDragging) return;

            const pointer = stage.getPointerPosition();
            if (!pointer) return;

            if (
                Math.hypot(
                    pointer.x - pointerStart.x,
                    pointer.y - pointerStart.y
                ) > CLICK_MOVE_THRESHOLD
            ) {
                hasDraggedSincePointerStart = true;
            }

            const dx = (pointer.x - lastPointer.x) / scale;
            const dy = (pointer.y - lastPointer.y) / scale;

            offset.x += dx;
            offset.y += dy;

            velocity = { x: dx, y: dy };
            lastPointer = pointer;

            requestRender();
        };

        const handlePointerEnd = (
            event?: Konva.KonvaEventObject<MouseEvent | TouchEvent>
        ) => {
            const shouldCenterClickedTile =
                isDragging &&
                event?.type === "mouseup" &&
                event?.evt instanceof MouseEvent &&
                event.evt.button === 0 &&
                !hasDraggedSincePointerStart;
            const clickedTile = shouldCenterClickedTile
                ? getTileAtPoint(stage.getPointerPosition() ?? pointerStart)
                : null;

            if (event && isTouchEvent(event.evt)) {
                stopTouchPropagation(event.evt);

                if (event.evt.touches.length < 2) {
                    handlePinchEnd();
                }
            }

            isDragging = false;
            container.style.cursor = CURSOR_GRAB;

            if (clickedTile) {
                centerTile(clickedTile);
                return;
            }

            startAnimation();
        };

        const endTrackpadPinchGesture = () => {
            trackpadPinchStartScale = targetScale;
            accumulatedTrackpadPinchDelta = 0;
            trackpadPinchTimeout = null;
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Control") {
                isControlKeyPressed = true;
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.key === "Control") {
                isControlKeyPressed = false;
            }
        };

        const handleWindowBlur = () => {
            isControlKeyPressed = false;
        };

        const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
            const wheelEvent = event.evt;
            wheelEvent.preventDefault();
            pauseImageLoading();
            momentumTargetOffset = null;

            if (wheelEvent.ctrlKey) {
                velocity = { x: 0, y: 0 };
                const zoomSensitivity = isControlKeyPressed
                    ? TRACKPAD_ZOOM_SENSITIVITY
                    : TRACKPAD_PINCH_ZOOM_SENSITIVITY;

                if (trackpadPinchTimeout === null) {
                    trackpadPinchStartScale = targetScale;
                    accumulatedTrackpadPinchDelta = 0;
                }

                accumulatedTrackpadPinchDelta += wheelEvent.deltaY;

                targetScale = clamp(
                    trackpadPinchStartScale *
                        Math.exp(
                            -accumulatedTrackpadPinchDelta *
                                zoomSensitivity
                        ),
                    minScale,
                    MAX_SCALE
                );
                zoomAnchorPoint = getPointerZoomPoint();

                if (trackpadPinchTimeout !== null) {
                    clearTimeout(trackpadPinchTimeout);
                }

                trackpadPinchTimeout = setTimeout(
                    endTrackpadPinchGesture,
                    TRACKPAD_PINCH_END_DELAY
                );

                startAnimation();
                return;
            }

            const deltaX = normalizeWheelDelta(
                wheelEvent.deltaX,
                wheelEvent.deltaMode,
                stage.width()
            );

            const deltaY = normalizeWheelDelta(
                wheelEvent.deltaY,
                wheelEvent.deltaMode,
                stage.height()
            );

            const wheelX = wheelEvent.shiftKey
                ? deltaX || deltaY
                : deltaX;

            const wheelY = wheelEvent.shiftKey ? 0 : deltaY;

            velocity.x -= (wheelX / scale) * WHEEL_IMPULSE;
            velocity.y -= (wheelY / scale) * WHEEL_IMPULSE;

            startAnimation();
        };
        const handleContainerTouchStart = (event: TouchEvent) => {
            stopTouchPropagation(event);
        };

        const handleContainerTouchEnd = (event: TouchEvent) => {
            stopTouchPropagation(event);
        };

        const handleContextMenu = (event: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const tile = getTileAtPoint({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            });

            container.removeAttribute(CONTEXT_IMAGE_SRC_ATTRIBUTE);

            if (!tile) return;

            container.setAttribute(CONTEXT_IMAGE_SRC_ATTRIBUTE, tile.item.image);
        };

        /* ------------------------------------------------------------------ */
        /*                               Resize                               */
        /* ------------------------------------------------------------------ */

        const handleResize = () => {
            stage.size({
                width: window.innerWidth,
                height: window.innerHeight,
            });

            const nextItemWidth = getItemWidth();
            const nextMinScale = getMinScale(nextItemWidth);

            if (nextItemWidth !== itemWidth) {
                itemWidth = nextItemWidth;
                imageRequestWidth = getImageRequestWidth(itemWidth);
            }

            minScale = nextMinScale;
            scale = clamp(scale, minScale, MAX_SCALE);
            targetScale = clamp(targetScale, minScale, MAX_SCALE);

            buildTiles();
        };

        /* ------------------------------------------------------------------ */
        /*                              Lifecycle                             */
        /* ------------------------------------------------------------------ */

        stage.on("mousedown touchstart", handlePointerStart);
        stage.on("mousemove touchmove", handlePointerMove);
        stage.on("mouseup mouseleave touchend touchcancel", handlePointerEnd);
        stage.on("wheel", handleWheel);

        container.addEventListener("touchstart", handleContainerTouchStart, {
            passive: false,
        });
        container.addEventListener("touchend", handleContainerTouchEnd, {
            passive: false,
        });
        container.addEventListener("touchcancel", handleContainerTouchEnd, {
            passive: false,
        });
        container.addEventListener("touchend", handlePinchEnd);
        container.addEventListener("touchcancel", handlePinchEnd);
        container.addEventListener("contextmenu", handleContextMenu);

        window.addEventListener("resize", handleResize);
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleWindowBlur);

        container.style.cursor = CURSOR_GRAB;

        buildTiles();

        return () => {
            isMounted = false;
            tileGeneration += 1;
            stopAnimation();

            if (renderFrameId !== null) {
                cancelAnimationFrame(renderFrameId);
            }

            if (sceneRevealFrameId !== null) {
                cancelAnimationFrame(sceneRevealFrameId);
            }

            if (sceneRevealSettleFrameId !== null) {
                cancelAnimationFrame(sceneRevealSettleFrameId);
            }

            if (trackpadPinchTimeout !== null) {
                clearTimeout(trackpadPinchTimeout);
            }

            if (imageLoadTimer !== null) {
                clearTimeout(imageLoadTimer);
            }

            if (imageLoadResumeTimer !== null) {
                clearTimeout(imageLoadResumeTimer);
            }

            window.removeEventListener("resize", handleResize);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleWindowBlur);

            container.removeEventListener(
                "touchstart",
                handleContainerTouchStart
            );
            container.removeEventListener("touchend", handleContainerTouchEnd);
            container.removeEventListener(
                "touchcancel",
                handleContainerTouchEnd
            );
            container.removeEventListener("touchend", handlePinchEnd);
            container.removeEventListener("touchcancel", handlePinchEnd);
            container.removeEventListener("contextmenu", handleContextMenu);

            stage.destroy();
            Konva.pixelRatio = previousPixelRatio;
        };
    }, []);

    return (
        <div
            className="w-full h-full"
            style={{
                opacity: sceneReady ? 1 : 0,
                transform: `scale(${sceneReady ? 1 : 1.2})`,
                transformOrigin: "center",
                transition:
                    "opacity 500ms cubic-bezier(0.16, 1, 0.3, 1), transform 500ms cubic-bezier(0.16, 1, 0.3, 1)",
                willChange: sceneReady ? "auto" : "opacity, transform",
            }}
        >
            <div
                ref={containerRef}
                className="w-full h-full overflow-hidden touch-none"
                style={{
                    contain: "strict",
                    touchAction: "none",
                    WebkitOverflowScrolling: "auto",
                }}
            />
        </div>
    );
}
