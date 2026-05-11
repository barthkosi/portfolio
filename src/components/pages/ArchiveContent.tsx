"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import Konva from "konva";
import archive from "@/data/archive.json";

const GAP = 32;
const MAX_SCALE = 1.5;
const MIN_SCALE = 0.5;

const DRAG_DECELERATION = 0.92;
const WHEEL_IMPULSE = 0.18;

const TRACKPAD_ZOOM_SENSITIVITY = 0.0015;
const TOUCH_PINCH_SENSITIVITY = 1.35;
const SCALE_EASING = 0.18;
const TRACKPAD_PINCH_END_DELAY = 120;

const CURSOR_GRAB = "url('/cursors/Cursor Grab.png') 12 12, grab";
const CURSOR_GRABBED =
    "url('/cursors/Cursor Grabbed.png') 12 12, grabbing";

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

export default function ArchiveContent() {
    const containerRef = useRef<HTMLDivElement>(null);

    const [isMobile, setIsMobile] = useState(false);
    const [sceneReady, setSceneReady] = useState(false);

    useEffect(() => {
        const check = () => {
            setIsMobile(window.innerWidth < 768);
        };

        check();
        window.addEventListener("resize", check);

        return () => window.removeEventListener("resize", check);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        setSceneReady(false);

        const container = containerRef.current;
        const ITEM_WIDTH = isMobile ? 200 : 400;

        const stage = new Konva.Stage({
            container,
            width: window.innerWidth,
            height: window.innerHeight,
        });

        const layer = new Konva.Layer();
        stage.add(layer);

        let scale = 1;
        let targetScale = 1;

        const offset = {
            x: 0,
            y: 0,
        };

        let totalWidth = 0;
        let colHeights: number[] = [];

        const sourceImages: SourceImage[] = [];
        const tiles: Tile[] = [];

        let hasSetInitialPosition = false;

        // ---------------------------------
        // Layout helpers
        // ---------------------------------

        const getRequiredCols = () => {
            const visibleWorldWidthAtMinScale = stage.width() / MIN_SCALE;

            return (
                Math.ceil(
                    visibleWorldWidthAtMinScale / (ITEM_WIDTH + GAP)
                ) + 2
            );
        };

        const clearTiles = () => {
            tiles.forEach(({ kImg }) => kImg.destroy());
            tiles.length = 0;
        };

        const addTile = (source: SourceImage) => {
            const colIndex = colHeights.indexOf(Math.min(...colHeights));

            const width = ITEM_WIDTH;
            const height = width * source.aspectRatio;

            const baseX = colIndex * (ITEM_WIDTH + GAP);
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

        const centerInitialViewOnFirstImage = () => {
            if (hasSetInitialPosition || tiles.length === 0) return;

            const firstTile = tiles[0];

            offset.x =
                stage.width() / (2 * scale) -
                firstTile.baseX -
                firstTile.width / 2;

            offset.y =
                stage.height() / (2 * scale) -
                firstTile.baseY -
                firstTile.height / 2;

            hasSetInitialPosition = true;
        };

        const buildTiles = () => {
            if (sourceImages.length === 0) return;

            clearTiles();

            const cols = getRequiredCols();

            totalWidth = cols * (ITEM_WIDTH + GAP);
            colHeights = Array(cols).fill(0);

            // Lay out each unique image once.
            sourceImages.forEach(addTile);

            centerInitialViewOnFirstImage();
            applyTransforms();

            // Trigger the entrance animation only after the real scene exists.
            setSceneReady(true);
        };

        // ---------------------------------
        // Transform / wrapping
        // ---------------------------------

        const applyTransforms = () => {
            tiles.forEach((tile) => {
                const {
                    kImg,
                    baseX,
                    baseY,
                    width,
                    height,
                    colIndex,
                } = tile;

                const colHeight = colHeights[colIndex];

                if (!colHeight) return;

                let wx = (baseX + offset.x) % totalWidth;
                let wy = (baseY + offset.y) % colHeight;

                if (wx < 0) wx += totalWidth;
                if (wy < 0) wy += colHeight;

                if (wx > totalWidth - width) wx -= totalWidth;
                if (wy > colHeight - height) wy -= colHeight;

                kImg.x(wx * scale);
                kImg.y(wy * scale);
                kImg.width(width * scale);
                kImg.height(height * scale);
            });

            layer.batchDraw();
        };

        // ---------------------------------
        // Image loading
        // ---------------------------------

        let loadedCount = 0;

        const loadedByIndex: Array<SourceImage | undefined> = new Array(
            archive.length
        );

        archive.forEach((item, index) => {
            const img = new Image();

            img.onload = () => {
                loadedByIndex[index] = {
                    id: item.id,
                    src: item.image,
                    image: img,
                    aspectRatio: img.naturalHeight / img.naturalWidth,
                };

                loadedCount++;

                if (loadedCount === archive.length) {
                    const orderedImages = loadedByIndex.filter(
                        (image): image is SourceImage => image !== undefined
                    );

                    const seenSources = new Set<string>();

                    sourceImages.push(
                        ...orderedImages.filter((image) => {
                            if (seenSources.has(image.src)) return false;

                            seenSources.add(image.src);
                            return true;
                        })
                    );

                    buildTiles();
                }
            };

            img.src = item.image;
        });

        // ---------------------------------
        // Shared animation / momentum system
        // ---------------------------------

        let isDragging = false;

        let lastMouse = {
            x: 0,
            y: 0,
        };

        let velocity = {
            x: 0,
            y: 0,
        };

        let rafId: number | null = null;

        const zoomToPoint = (
            newScale: number,
            px: number,
            py: number
        ) => {
            offset.x += px * (1 / newScale - 1 / scale);
            offset.y += py * (1 / newScale - 1 / scale);
            scale = newScale;
        };

        const animate = () => {
            let needsAnotherFrame = false;

            if (Math.abs(targetScale - scale) > 0.0001) {
                const nextScale =
                    scale + (targetScale - scale) * SCALE_EASING;

                const pointer = stage.getPointerPosition();

                const zoomPoint = pointer ?? {
                    x: stage.width() / 2,
                    y: stage.height() / 2,
                };

                zoomToPoint(nextScale, zoomPoint.x, zoomPoint.y);

                needsAnotherFrame = true;
            }

            if (
                Math.abs(velocity.x) >= 0.01 ||
                Math.abs(velocity.y) >= 0.01
            ) {
                velocity.x *= DRAG_DECELERATION;
                velocity.y *= DRAG_DECELERATION;

                offset.x += velocity.x;
                offset.y += velocity.y;

                needsAnotherFrame = true;
            } else {
                velocity = { x: 0, y: 0 };
            }

            applyTransforms();

            if (needsAnotherFrame) {
                rafId = requestAnimationFrame(animate);
            } else {
                rafId = null;
            }
        };

        const startAnimation = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(animate);
        };

        const stopAnimation = () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        };

        // ---------------------------------
        // Dragging
        // ---------------------------------

        stage.on("mousedown touchstart", () => {
            isDragging = true;
            stopAnimation();

            const pos = stage.getPointerPosition();
            if (!pos) return;

            lastMouse = {
                x: pos.x,
                y: pos.y,
            };

            velocity = {
                x: 0,
                y: 0,
            };

            container.style.cursor = CURSOR_GRABBED;
        });

        stage.on("mousemove touchmove", () => {
            if (!isDragging) return;

            const pos = stage.getPointerPosition();
            if (!pos) return;

            const dx = (pos.x - lastMouse.x) / scale;
            const dy = (pos.y - lastMouse.y) / scale;

            offset.x += dx;
            offset.y += dy;

            velocity = {
                x: dx,
                y: dy,
            };

            lastMouse = {
                x: pos.x,
                y: pos.y,
            };

            applyTransforms();
        });

        stage.on("mouseup mouseleave touchend", () => {
            isDragging = false;
            container.style.cursor = CURSOR_GRAB;
            startAnimation();
        });

        // ---------------------------------
        // Wheel helpers
        // ---------------------------------

        const normalizeWheelDelta = (
            delta: number,
            deltaMode: number
        ) => {
            if (deltaMode === 0) return delta;
            if (deltaMode === 1) return delta * 16;
            return delta * stage.height();
        };

        // ---------------------------------
        // Wheel / desktop trackpad
        // ---------------------------------

        let trackpadPinchStartScale = scale;
        let accumulatedTrackpadPinchDelta = 0;
        let trackpadPinchTimeout: ReturnType<typeof setTimeout> | null = null;

        const endTrackpadPinchGesture = () => {
            trackpadPinchStartScale = targetScale;
            accumulatedTrackpadPinchDelta = 0;
            trackpadPinchTimeout = null;
        };

        stage.on("wheel", (e: Konva.KonvaEventObject<WheelEvent>) => {
            e.evt.preventDefault();

            const evt = e.evt;

            if (evt.ctrlKey) {
                velocity = { x: 0, y: 0 };

                if (trackpadPinchTimeout === null) {
                    trackpadPinchStartScale = targetScale;
                    accumulatedTrackpadPinchDelta = 0;
                }

                accumulatedTrackpadPinchDelta += evt.deltaY;

                targetScale = Math.max(
                    MIN_SCALE,
                    Math.min(
                        MAX_SCALE,
                        trackpadPinchStartScale *
                            Math.exp(
                                -accumulatedTrackpadPinchDelta *
                                    TRACKPAD_ZOOM_SENSITIVITY
                            )
                    )
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

            const rawDeltaX = normalizeWheelDelta(
                evt.deltaX,
                evt.deltaMode
            );

            const rawDeltaY = normalizeWheelDelta(
                evt.deltaY,
                evt.deltaMode
            );

            let wheelX = rawDeltaX;
            let wheelY = rawDeltaY;

            if (evt.shiftKey) {
                wheelX = rawDeltaX !== 0 ? rawDeltaX : rawDeltaY;
                wheelY = 0;
            }

            velocity.x -= (wheelX / scale) * WHEEL_IMPULSE;
            velocity.y -= (wheelY / scale) * WHEEL_IMPULSE;

            startAnimation();
        });

        // ---------------------------------
        // Mobile pinch zoom
        // ---------------------------------

        let pinchStartDist = 0;
        let pinchStartScale = scale;

        const onPinchMove = (e: TouchEvent) => {
            if (e.touches.length !== 2) return;

            e.preventDefault();

            velocity = { x: 0, y: 0 };

            const dx =
                e.touches[0].clientX -
                e.touches[1].clientX;

            const dy =
                e.touches[0].clientY -
                e.touches[1].clientY;

            const dist = Math.sqrt(dx * dx + dy * dy);

            if (!pinchStartDist) {
                pinchStartDist = dist;
                pinchStartScale = targetScale;
                return;
            }

            const gestureRatio = dist / pinchStartDist;

            targetScale = Math.min(
                MAX_SCALE,
                Math.max(
                    MIN_SCALE,
                    pinchStartScale *
                        Math.pow(gestureRatio, TOUCH_PINCH_SENSITIVITY)
                )
            );

            startAnimation();
        };

        const onPinchEnd = () => {
            pinchStartDist = 0;
            pinchStartScale = targetScale;
        };

        container.addEventListener("touchmove", onPinchMove, {
            passive: false,
        });

        container.addEventListener("touchend", onPinchEnd);

        // ---------------------------------
        // Resize
        // ---------------------------------

        const onResize = () => {
            stage.width(window.innerWidth);
            stage.height(window.innerHeight);

            buildTiles();
        };

        window.addEventListener("resize", onResize);

        // ---------------------------------
        // Init / cleanup
        // ---------------------------------

        container.style.cursor = CURSOR_GRAB;

        return () => {
            stopAnimation();

            if (trackpadPinchTimeout !== null) {
                clearTimeout(trackpadPinchTimeout);
            }

            window.removeEventListener("resize", onResize);

            container.removeEventListener("touchmove", onPinchMove);
            container.removeEventListener("touchend", onPinchEnd);

            stage.destroy();
        };
    }, [isMobile]);

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