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

const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;

const DRAG_DECELERATION = 0.92;
const WHEEL_IMPULSE = 0.18;

const TRACKPAD_ZOOM_SENSITIVITY = 0.0015;
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

        let scale = 1;
        let targetScale = 1;

        let totalWidth = 0;
        let colHeights: number[] = [];

        const tiles: Tile[] = [];
        let tileGeneration = 0;
        let isMounted = true;

        let hasCenteredInitialView = false;
        let isDragging = false;

        let lastPointer: Point = { x: 0, y: 0 };
        let animationFrameId: number | null = null;
        let renderFrameId: number | null = null;
        let sceneRevealFrameId: number | null = null;
        let sceneRevealSettleFrameId: number | null = null;

        let trackpadPinchStartScale = scale;
        let accumulatedTrackpadPinchDelta = 0;
        let trackpadPinchTimeout: ReturnType<typeof setTimeout> | null =
            null;

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
            const visibleWidthAtMinScale = stage.width() / MIN_SCALE;

            return Math.ceil(visibleWidthAtMinScale / (itemWidth + GAP)) + 2;
        };

        const getRequiredColumnHeight = () => {
            const visibleHeightAtMinScale = stage.height() / MIN_SCALE;
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

        const getZoomPoint = (): Point =>
            stage.getPointerPosition() ?? {
                x: stage.width() / 2,
                y: stage.height() / 2,
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
            }

            applyTransforms();

            if (!shouldContinue) {
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

        const handlePointerStart = (
            event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
        ) => {
            if (isMultiTouchEvent(event.evt)) {
                isDragging = false;
                return;
            }

            pauseImageLoading();
            isDragging = true;
            stopAnimation();

            const pointer = stage.getPointerPosition();
            if (!pointer) return;

            lastPointer = pointer;
            velocity = { x: 0, y: 0 };

            container.style.cursor = CURSOR_GRABBED;
        };

        const handlePointerMove = (
            event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
        ) => {
            if (isMultiTouchEvent(event.evt)) {
                return;
            }

            if (!isDragging) return;

            const pointer = stage.getPointerPosition();
            if (!pointer) return;

            const dx = (pointer.x - lastPointer.x) / scale;
            const dy = (pointer.y - lastPointer.y) / scale;

            offset.x += dx;
            offset.y += dy;

            velocity = { x: dx, y: dy };
            lastPointer = pointer;

            requestRender();
        };

        const handlePointerEnd = () => {
            isDragging = false;
            container.style.cursor = CURSOR_GRAB;
            startAnimation();
        };

        const endTrackpadPinchGesture = () => {
            trackpadPinchStartScale = targetScale;
            accumulatedTrackpadPinchDelta = 0;
            trackpadPinchTimeout = null;
        };

        const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
            const wheelEvent = event.evt;
            wheelEvent.preventDefault();
            pauseImageLoading();

            if (wheelEvent.ctrlKey) {
                velocity = { x: 0, y: 0 };

                if (trackpadPinchTimeout === null) {
                    trackpadPinchStartScale = targetScale;
                    accumulatedTrackpadPinchDelta = 0;
                }

                accumulatedTrackpadPinchDelta += wheelEvent.deltaY;

                targetScale = clamp(
                    trackpadPinchStartScale *
                        Math.exp(
                            -accumulatedTrackpadPinchDelta *
                                TRACKPAD_ZOOM_SENSITIVITY
                        ),
                    MIN_SCALE,
                    MAX_SCALE
                );

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

        const handlePinchMove = (event: TouchEvent) => {
            if (event.touches.length !== 2) return;

            event.preventDefault();
            pauseImageLoading();
            stopAnimation();
            velocity = { x: 0, y: 0 };
            isDragging = false;

            const distance = getTouchDistance(event.touches);

            if (!pinchStartDistance) {
                pinchStartDistance = distance;
                pinchStartScale = scale;
                return;
            }

            const gestureRatio = distance / pinchStartDistance;

            const nextScale = clamp(
                pinchStartScale *
                    Math.pow(gestureRatio, TOUCH_PINCH_SENSITIVITY),
                MIN_SCALE,
                MAX_SCALE
            );

            targetScale = nextScale;
            zoomToPoint(nextScale, getTouchCenter(event.touches));
            requestRender();
        };

        const handlePinchEnd = () => {
            pinchStartDistance = 0;
            targetScale = scale;
            pinchStartScale = scale;
            resumeImageLoadingSoon();
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

            if (nextItemWidth !== itemWidth) {
                itemWidth = nextItemWidth;
                imageRequestWidth = getImageRequestWidth(itemWidth);
            }

            buildTiles();
        };

        /* ------------------------------------------------------------------ */
        /*                              Lifecycle                             */
        /* ------------------------------------------------------------------ */

        stage.on("mousedown touchstart", handlePointerStart);
        stage.on("mousemove touchmove", handlePointerMove);
        stage.on("mouseup mouseleave touchend", handlePointerEnd);
        stage.on("wheel", handleWheel);

        container.addEventListener("touchmove", handlePinchMove, {
            passive: false,
        });
        container.addEventListener("touchend", handlePinchEnd);

        window.addEventListener("resize", handleResize);

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

            container.removeEventListener("touchmove", handlePinchMove);
            container.removeEventListener("touchend", handlePinchEnd);

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
                style={{ contain: "strict" }}
            />
        </div>
    );
}
