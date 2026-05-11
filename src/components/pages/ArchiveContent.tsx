"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import Konva from "konva";
import archive from "@/data/archive.json";

/* -------------------------------------------------------------------------- */
/*                                    Config                                  */
/* -------------------------------------------------------------------------- */

const GAP = 32;
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

type SourceImage = {
    id: string;
    src: string;
    image: HTMLImageElement;
    aspectRatio: number;
};

type Tile = {
    kImg: Konva.Image;
    source: SourceImage;
    baseX: number;
    baseY: number;
    width: number;
    height: number;
    colIndex: number;
};

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

const dedupeBySource = (images: SourceImage[]) => {
    const seen = new Set<string>();

    return images.filter((image) => {
        if (seen.has(image.src)) return false;

        seen.add(image.src);
        return true;
    });
};

const loadImage = (
    item: (typeof archive)[number]
): Promise<SourceImage | null> =>
    new Promise((resolve) => {
        const image = new Image();

        image.onload = () => {
            resolve({
                id: item.id,
                src: item.image,
                image,
                aspectRatio: image.naturalHeight / image.naturalWidth,
            });
        };

        image.onerror = () => {
            resolve(null);
        };

        image.src = item.image;
    });

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

export default function ArchiveContent() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [sceneReady, setSceneReady] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let itemWidth = getItemWidth();

        const stage = new Konva.Stage({
            container,
            width: window.innerWidth,
            height: window.innerHeight,
        });

        const layer = new Konva.Layer();
        stage.add(layer);

        const offset: Point = { x: 0, y: 0 };
        let velocity: Point = { x: 0, y: 0 };

        let scale = 1;
        let targetScale = 1;

        let totalWidth = 0;
        let colHeights: number[] = [];

        let sourceImages: SourceImage[] = [];
        const tiles: Tile[] = [];

        let hasCenteredInitialView = false;
        let isDragging = false;

        let lastPointer: Point = { x: 0, y: 0 };
        let animationFrameId: number | null = null;

        let trackpadPinchStartScale = scale;
        let accumulatedTrackpadPinchDelta = 0;
        let trackpadPinchTimeout: ReturnType<typeof setTimeout> | null =
            null;

        let pinchStartDistance = 0;
        let pinchStartScale = scale;

        /* ------------------------------------------------------------------ */
        /*                                Layout                              */
        /* ------------------------------------------------------------------ */

        const getRequiredColumnCount = () => {
            const visibleWidthAtMinScale = stage.width() / MIN_SCALE;

            return Math.ceil(visibleWidthAtMinScale / (itemWidth + GAP)) + 2;
        };

        const clearTiles = () => {
            for (const tile of tiles) {
                tile.kImg.destroy();
            }

            tiles.length = 0;
        };

        const createTile = (source: SourceImage) => {
            const colIndex = getShortestColumnIndex(colHeights);
            const width = itemWidth;
            const height = width * source.aspectRatio;
            const baseX = colIndex * (itemWidth + GAP);
            const baseY = colHeights[colIndex];

            const kImg = new Konva.Image({
                image: source.image,
                x: baseX,
                y: baseY,
                width,
                height,
            });

            layer.add(kImg);

            tiles.push({
                kImg,
                source,
                baseX,
                baseY,
                width,
                height,
                colIndex,
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

        const buildTiles = () => {
            if (sourceImages.length === 0) return;

            clearTiles();

            const columnCount = getRequiredColumnCount();

            totalWidth = columnCount * (itemWidth + GAP);
            colHeights = Array(columnCount).fill(0);

            for (const image of sourceImages) {
                createTile(image);
            }

            centerInitialView();
            applyTransforms();
            setSceneReady(true);
        };

        /* ------------------------------------------------------------------ */
        /*                              Rendering                             */
        /* ------------------------------------------------------------------ */

        const applyTransforms = () => {
            for (const tile of tiles) {
                const { kImg, baseX, baseY, width, height, colIndex } = tile;
                const colHeight = colHeights[colIndex];

                if (!colHeight) continue;

                let x = positiveModulo(baseX + offset.x, totalWidth);
                let y = positiveModulo(baseY + offset.y, colHeight);

                if (x > totalWidth - width) x -= totalWidth;
                if (y > colHeight - height) y -= colHeight;

                kImg.position({
                    x: x * scale,
                    y: y * scale,
                });

                kImg.size({
                    width: width * scale,
                    height: height * scale,
                });
            }

            layer.batchDraw();
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

        /* ------------------------------------------------------------------ */
        /*                               Input                                */
        /* ------------------------------------------------------------------ */

        const handlePointerStart = () => {
            isDragging = true;
            stopAnimation();

            const pointer = stage.getPointerPosition();
            if (!pointer) return;

            lastPointer = pointer;
            velocity = { x: 0, y: 0 };

            container.style.cursor = CURSOR_GRABBED;
        };

        const handlePointerMove = () => {
            if (!isDragging) return;

            const pointer = stage.getPointerPosition();
            if (!pointer) return;

            const dx = (pointer.x - lastPointer.x) / scale;
            const dy = (pointer.y - lastPointer.y) / scale;

            offset.x += dx;
            offset.y += dy;

            velocity = { x: dx, y: dy };
            lastPointer = pointer;

            applyTransforms();
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
            velocity = { x: 0, y: 0 };

            const distance = getTouchDistance(event.touches);

            if (!pinchStartDistance) {
                pinchStartDistance = distance;
                pinchStartScale = targetScale;
                return;
            }

            const gestureRatio = distance / pinchStartDistance;

            targetScale = clamp(
                pinchStartScale *
                    Math.pow(gestureRatio, TOUCH_PINCH_SENSITIVITY),
                MIN_SCALE,
                MAX_SCALE
            );

            startAnimation();
        };

        const handlePinchEnd = () => {
            pinchStartDistance = 0;
            pinchStartScale = targetScale;
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
            }

            buildTiles();
        };

        /* ------------------------------------------------------------------ */
        /*                              Lifecycle                             */
        /* ------------------------------------------------------------------ */

        const initialise = async () => {
            const loadedImages = await Promise.all(archive.map(loadImage));

            sourceImages = dedupeBySource(
                loadedImages.filter(
                    (image): image is SourceImage => image !== null
                )
            );

            buildTiles();
        };

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

        void initialise();

        return () => {
            stopAnimation();

            if (trackpadPinchTimeout !== null) {
                clearTimeout(trackpadPinchTimeout);
            }

            window.removeEventListener("resize", handleResize);

            container.removeEventListener("touchmove", handlePinchMove);
            container.removeEventListener("touchend", handlePinchEnd);

            stage.destroy();
        };
    }, []);

    return (
        <motion.div
            initial={false}
            animate={
                sceneReady
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 0.8 }
            }
            transition={{
                duration: 0.4,
                ease: [0.23, 1, 0.32, 1],
            }}
            className="w-full h-full origin-center"
        >
            <div
                ref={containerRef}
                className="w-full h-full overflow-hidden touch-none"
            />
        </motion.div>
    );
}