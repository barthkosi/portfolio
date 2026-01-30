"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import Card from "@/components/interface/Card";
import archive from "@/data/archive.json";
import { useLoading } from "@/context/LoadingContext";

const GAP = 32;
// Updated paths for Next.js pubic assets
const CURSOR_GRAB = "url('/cursors/Cursor Grab.png') 12 12, grab";
const CURSOR_GRABBED = "url('/cursors/Cursor Grabbed.png') 12 12, grabbing";
const MIN_COLS = 4;

export default function ArchiveContent() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isGrabbing, setIsGrabbing] = useState(false);
    const [imageHeights, setImageHeights] = useState<Record<string, number>>({});
    const { addBlocker, removeBlocker } = useLoading();

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const ITEM_WIDTH = isMobile ? 250 : 400;
    const COLS = Math.max(MIN_COLS, Math.ceil(Math.sqrt(archive.length)));

    const CARD_PADDING = 16;

    // Helper to detect if a URL is a video
    const isVideoUrl = (url: string): boolean => {
        const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.ogv'];
        const lowercaseUrl = url.toLowerCase();
        return videoExtensions.some(ext => lowercaseUrl.includes(ext));
    };

    useEffect(() => {
        addBlocker('archive-layout');

        const loadedHeights: Record<string, number> = {};
        let loadedCount = 0;

        const finishLoading = () => {
            setImageHeights({ ...loadedHeights });
            removeBlocker('archive-layout');
        };

        const handleLoad = (id: string, height: number) => {
            loadedHeights[id] = height + CARD_PADDING;
            loadedCount++;
            if (loadedCount === archive.length) {
                finishLoading();
            }
        };

        const handleError = (id: string) => {
            loadedHeights[id] = ITEM_WIDTH + CARD_PADDING;
            loadedCount++;
            if (loadedCount === archive.length) {
                finishLoading();
            }
        };

        archive.forEach((item) => {
            if (isVideoUrl(item.image)) {
                // Handle video preloading
                const video = document.createElement('video');
                video.onloadedmetadata = () => {
                    const aspectRatio = video.videoHeight / video.videoWidth;
                    handleLoad(item.id, ITEM_WIDTH * aspectRatio);
                };
                video.onerror = () => handleError(item.id);
                video.src = item.image;
            } else {
                // Handle image preloading
                const img = new Image();
                img.onload = () => {
                    const aspectRatio = img.naturalHeight / img.naturalWidth;
                    handleLoad(item.id, ITEM_WIDTH * aspectRatio);
                };
                img.onerror = () => handleError(item.id);
                img.src = item.image;
            }
        });

        return () => removeBlocker('archive-layout');
    }, [ITEM_WIDTH, addBlocker, removeBlocker]);

    const itemPositions = useMemo(() => {
        if (Object.keys(imageHeights).length < archive.length) {
            return null;
        }

        const positions: { id: string; x: number; y: number; height: number; image: string; colIndex: number }[] = [];
        const columnHeights = Array(COLS).fill(0);

        archive.forEach((item) => {
            const colIndex = positions.length % COLS;
            const x = colIndex * (ITEM_WIDTH + GAP);
            const y = columnHeights[colIndex];
            const height = imageHeights[item.id] || ITEM_WIDTH;

            positions.push({
                id: item.id,
                x,
                y,
                height,
                image: item.image,
                colIndex
            });

            columnHeights[colIndex] += height + GAP;
        });

        return positions;
    }, [imageHeights, COLS, ITEM_WIDTH]);

    const { totalDimensions, columnTotalHeights } = useMemo(() => {
        if (!itemPositions) return { totalDimensions: { width: 0, height: 0 }, columnTotalHeights: [] };

        const colHeights = Array(COLS).fill(0);
        itemPositions.forEach((pos) => {
            colHeights[pos.colIndex] = Math.max(colHeights[pos.colIndex], pos.y + pos.height + GAP);
        });

        return {
            totalDimensions: {
                width: COLS * (ITEM_WIDTH + GAP),
                height: Math.max(...colHeights)
            },
            columnTotalHeights: colHeights
        };
    }, [itemPositions, COLS, ITEM_WIDTH]);

    const position = useRef({ x: 0, y: 0 });
    const velocity = useRef({ x: 0, y: 0 });
    const lastMouse = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const animationFrameId = useRef<number | null>(null);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (!hasInitialized.current && totalDimensions.width > 0 && totalDimensions.height > 0) {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            position.current.x = (viewportWidth - totalDimensions.width) / 2;
            position.current.y = (viewportHeight - totalDimensions.height) / 2;

            hasInitialized.current = true;
        }
    }, [totalDimensions]);

    // Physics loop
    useEffect(() => {
        if (!itemPositions || columnTotalHeights.length === 0) return;

        const { width: TOTAL_WIDTH } = totalDimensions;
        if (TOTAL_WIDTH === 0) return;

        const loop = () => {
            if (!isDragging.current) {
                velocity.current.x *= 0.92;
                velocity.current.y *= 0.92;
                position.current.x += velocity.current.x;
                position.current.y += velocity.current.y;
            }

            if (Math.abs(velocity.current.x) < 0.01) velocity.current.x = 0;
            if (Math.abs(velocity.current.y) < 0.01) velocity.current.y = 0;

            if (containerRef.current) {
                const children = containerRef.current.children;

                for (let i = 0; i < children.length; i++) {
                    const item = children[i] as HTMLElement;
                    const pos = itemPositions[i];
                    if (!pos) continue;

                    // Use per-column height for Y wrapping
                    const colHeight = columnTotalHeights[pos.colIndex] || totalDimensions.height;

                    let currentX = (pos.x + position.current.x) % TOTAL_WIDTH;
                    let currentY = (pos.y + position.current.y) % colHeight;

                    if (currentX < 0) currentX += TOTAL_WIDTH;
                    if (currentY < 0) currentY += colHeight;

                    if (currentX > TOTAL_WIDTH - ITEM_WIDTH) currentX -= TOTAL_WIDTH;
                    if (currentY > colHeight - pos.height) currentY -= colHeight;

                    item.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
                }
            }

            animationFrameId.current = requestAnimationFrame(loop);
        };

        animationFrameId.current = requestAnimationFrame(loop);
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [itemPositions, totalDimensions, columnTotalHeights, ITEM_WIDTH]);

    // 4. EVENTS: 2D Dragging Handlers
    const handleStart = (clientX: number, clientY: number) => {
        isDragging.current = true;
        lastMouse.current = { x: clientX, y: clientY };
        velocity.current = { x: 0, y: 0 }; // Reset inertia
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!isDragging.current) return;

        const deltaX = clientX - lastMouse.current.x;
        const deltaY = clientY - lastMouse.current.y;

        position.current.x += deltaX;
        position.current.y += deltaY;

        // Velocity is the difference between frames
        velocity.current = { x: deltaX, y: deltaY };
        lastMouse.current = { x: clientX, y: clientY };
    };

    return (
        <div
            className="w-full h-full overflow-visible relative touch-none"
            style={{ cursor: isGrabbing ? CURSOR_GRABBED : CURSOR_GRAB }}
            onMouseDown={(e) => { handleStart(e.clientX, e.clientY); setIsGrabbing(true); }}
            onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
            onMouseUp={() => { isDragging.current = false; setIsGrabbing(false); }}
            onMouseLeave={() => { isDragging.current = false; setIsGrabbing(false); }}
            onTouchStart={(e) => { handleStart(e.touches[0].clientX, e.touches[0].clientY); setIsGrabbing(true); }}
            onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={() => { isDragging.current = false; setIsGrabbing(false); }}
            onWheel={(e) => {
                velocity.current.x -= e.deltaX * 0.1;
                velocity.current.y -= e.deltaY * 0.1;
            }}
        >
            <div ref={containerRef} className="w-full h-full pointer-events-none overflow-visible">
                {itemPositions?.map((pos) => (
                    <div
                        key={pos.id}
                        className="absolute flex items-center justify-center overflow-visible"
                        style={{
                            width: `${ITEM_WIDTH}px`,
                            top: 0,
                            left: 0,
                            willChange: 'transform'
                        }}
                    >
                        <Card
                            image={pos.image}
                            aspectRatio="auto"
                        />
                    </div>
                ))}
            </div>

            <div className="absolute bottom-10 left-0 w-full text-center text-[var(--content-tertiary)] pointer-events-none select-none label-s">
                drag/scroll to explore
            </div>
        </div>
    );
}
