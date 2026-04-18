"use client";

import { useRef, useEffect, useState, useMemo, memo } from "react";
import Card from "@/components/interface/Card";
import archive from "@/data/archive.json";
import { Motion } from "@/lib/transitions";
import { AnimatePresence, motion } from "motion/react";

const GAP = 32;
const CURSOR_GRAB = "url('/cursors/Cursor Grab.png') 12 12, grab";
const CURSOR_GRABBED = "url('/cursors/Cursor Grabbed.png') 12 12, grabbing";
const MIN_COLS = 4;

const isVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.ogv'];
    const lowercaseUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowercaseUrl.includes(ext));
};

type DownloadProgress = {
    totalBytes: number;
    loadedBytes: number;
};

async function readResponseAsBlob(
    response: Response,
    onChunk: (bytes: number) => void
): Promise<string> {
    if (!response.body) {
        const blob = await response.blob();
        onChunk(blob.size);
        return URL.createObjectURL(blob);
    }

    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        onChunk(value.length);
    }

    const blob = new Blob(chunks);
    return URL.createObjectURL(blob);
}

export default function ArchiveContent() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isGrabbing, setIsGrabbing] = useState(false);
    const [imageHeights, setImageHeights] = useState<Record<string, number>>({});

    const [isDownloading, setIsDownloading] = useState(true);
    const [progress, setProgress] = useState<DownloadProgress>({ totalBytes: 0, loadedBytes: 0 });
    const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

    // Refs for tracking progress across async loops without triggering re-renders
    const loadedBytesRef = useRef(0);
    const totalBytesRef = useRef(0);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const downloadAll = async () => {
            let rafPending = false;

            const scheduleFlush = () => {
                if (!rafPending) {
                    rafPending = true;
                    requestAnimationFrame(() => {
                        if (!cancelled) {
                            setProgress({
                                totalBytes: totalBytesRef.current,
                                loadedBytes: loadedBytesRef.current
                            });
                        }
                        rafPending = false;
                    });
                }
            };

            // Phase 1: Header fetch to get exact total size
            const activeResponses: { item: typeof archive[number]; response: Response }[] = [];

            const headerPromises = archive.map(async (item) => {
                try {
                    const res = await fetch(item.image);
                    const cl = res.headers.get("content-length");
                    const size = cl ? parseInt(cl, 10) : 0;

                    if (!cancelled) {
                        totalBytesRef.current += size;
                        activeResponses.push({ item, response: res });
                    }
                } catch (err) {
                    console.error("Fetch failed for", item.image, err);
                    if (!cancelled) {
                        activeResponses.push({ item, response: null as any });
                    }
                }
            });

            await Promise.all(headerPromises);
            scheduleFlush();

            // Phase 2: Stream bodies
            const results: Record<string, string> = {};

            const streamPromises = activeResponses.map(async ({ item, response }) => {
                if (!response) {
                    results[item.id] = item.image;
                    return;
                }

                try {
                    const blobUrl = await readResponseAsBlob(response, (chunkSize) => {
                        loadedBytesRef.current += chunkSize;
                        scheduleFlush();
                    });
                    if (!cancelled) results[item.id] = blobUrl;
                } catch (err) {
                    console.error("Stream failed for", item.image, err);
                    results[item.id] = item.image;
                }
            });

            await Promise.all(streamPromises);

            if (!cancelled) {
                setBlobUrls(results);
                setTimeout(() => {
                    if (!cancelled) setIsDownloading(false);
                }, 400);
            }
        };

        downloadAll();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        return () => {
            Object.values(blobUrls).forEach(url => {
                if (url.startsWith("blob:")) URL.revokeObjectURL(url);
            });
        };
    }, [blobUrls]);

    const ITEM_WIDTH = isMobile ? 250 : 400;
    const COLS = Math.max(MIN_COLS, Math.ceil(Math.sqrt(archive.length)));
    const CARD_PADDING = 16;

    useEffect(() => {
        if (isDownloading || Object.keys(blobUrls).length === 0) return;

        const loadedHeights: Record<string, number> = {};
        let loadedCount = 0;

        const handleLoad = (id: string, height: number) => {
            loadedHeights[id] = height + CARD_PADDING;
            loadedCount++;
            if (loadedCount === archive.length) setImageHeights({ ...loadedHeights });
        };

        const handleError = (id: string) => {
            loadedHeights[id] = ITEM_WIDTH + CARD_PADDING;
            loadedCount++;
            if (loadedCount === archive.length) setImageHeights({ ...loadedHeights });
        };

        archive.forEach((item) => {
            const src = blobUrls[item.id] || item.image;
            if (isVideoUrl(item.image)) {
                const video = document.createElement('video');
                video.onloadedmetadata = () => handleLoad(item.id, ITEM_WIDTH * (video.videoHeight / video.videoWidth));
                video.onerror = () => handleError(item.id);
                video.src = src;
            } else {
                const img = new Image();
                img.onload = () => handleLoad(item.id, ITEM_WIDTH * (img.naturalHeight / img.naturalWidth));
                img.onerror = () => handleError(item.id);
                img.src = src;
            }
        });
    }, [isDownloading, blobUrls, ITEM_WIDTH]);

    const itemPositions = useMemo(() => {
        if (Object.keys(imageHeights).length < archive.length) return null;

        const positions: any[] = [];
        const columnHeights = Array(COLS).fill(0);

        archive.forEach((item) => {
            const colIndex = positions.length % COLS;
            const x = colIndex * (ITEM_WIDTH + GAP);
            const y = columnHeights[colIndex];
            const height = imageHeights[item.id] || ITEM_WIDTH;

            positions.push({ id: item.id, x, y, height, image: blobUrls[item.id] || item.image, colIndex });
            columnHeights[colIndex] += height + GAP;
        });

        return positions;
    }, [imageHeights, COLS, ITEM_WIDTH, blobUrls]);

    const { totalDimensions, columnTotalHeights } = useMemo(() => {
        if (!itemPositions) return { totalDimensions: { width: 0, height: 0 }, columnTotalHeights: [] };
        const colHeights = Array(COLS).fill(0);
        itemPositions.forEach(pos => { colHeights[pos.colIndex] = Math.max(colHeights[pos.colIndex], pos.y + pos.height + GAP); });
        return { totalDimensions: { width: COLS * (ITEM_WIDTH + GAP), height: Math.max(...colHeights) }, columnTotalHeights: colHeights };
    }, [itemPositions, COLS, ITEM_WIDTH]);

    const position = useRef({ x: 0, y: 0 });
    const velocity = useRef({ x: 0, y: 0 });
    const lastMouse = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (!hasInitialized.current && totalDimensions.width > 0) {
            position.current = { x: (window.innerWidth - totalDimensions.width) / 2, y: (window.innerHeight - totalDimensions.height) / 2 };
            hasInitialized.current = true;
        }
    }, [totalDimensions]);

    useEffect(() => {
        if (!itemPositions || columnTotalHeights.length === 0) return;
        const { width: TOTAL_WIDTH } = totalDimensions;

        const loop = () => {
            if (!isDragging.current) {
                velocity.current.x *= 0.92;
                velocity.current.y *= 0.92;
                position.current.x += velocity.current.x;
                position.current.y += velocity.current.y;
            }

            if (containerRef.current) {
                const children = containerRef.current.children;
                for (let i = 0; i < children.length; i++) {
                    const item = children[i] as HTMLElement;
                    const pos = itemPositions[i];
                    if (!pos) continue;

                    const colHeight = columnTotalHeights[pos.colIndex];
                    let currentX = (pos.x + position.current.x) % TOTAL_WIDTH;
                    let currentY = (pos.y + position.current.y) % colHeight;

                    if (currentX < 0) currentX += TOTAL_WIDTH;
                    if (currentY < 0) currentY += colHeight;
                    if (currentX > TOTAL_WIDTH - ITEM_WIDTH) currentX -= TOTAL_WIDTH;
                    if (currentY > colHeight - pos.height) currentY -= colHeight;

                    item.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
                }
            }
            requestAnimationFrame(loop);
        };

        const id = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(id);
    }, [itemPositions, totalDimensions, columnTotalHeights, ITEM_WIDTH]);

    const percent = progress.totalBytes > 0 ? Math.min(100, (progress.loadedBytes / progress.totalBytes) * 100) : 0;

    // --- LOADING BAR UI ---
    return (
        <AnimatePresence mode="wait">
            {isDownloading ? (
                <div key="loader" className="w-full h-full flex items-center justify-center p-4">
                    <Loader percent={percent} delay={0.6} />
                </div>
            ) : (
                <div key="content" className="w-full h-full">
                    <style>{`
                        .archive-grab-cursor, .archive-grab-cursor * { cursor: ${CURSOR_GRAB} !important; }
                        .archive-grabbed-cursor, .archive-grabbed-cursor * { cursor: ${CURSOR_GRABBED} !important; }
                    `}</style>
                    <div
                        className={`w-full h-full overflow-visible relative touch-none ${isGrabbing ? 'archive-grabbed-cursor' : 'archive-grab-cursor'}`}
                        onMouseDown={(e) => { e.preventDefault(); isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; velocity.current = { x: 0, y: 0 }; setIsGrabbing(true); }}
                        onMouseMove={(e) => { if (isDragging.current) { const dx = e.clientX - lastMouse.current.x; const dy = e.clientY - lastMouse.current.y; position.current.x += dx; position.current.y += dy; velocity.current = { x: dx, y: dy }; lastMouse.current = { x: e.clientX, y: e.clientY }; } }}
                        onMouseUp={() => { isDragging.current = false; setIsGrabbing(false); }}
                        onMouseLeave={() => { isDragging.current = false; setIsGrabbing(false); }}
                        onTouchStart={(e) => { isDragging.current = true; lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; velocity.current = { x: 0, y: 0 }; setIsGrabbing(true); }}
                        onTouchMove={(e) => { if (isDragging.current) { const dx = e.touches[0].clientX - lastMouse.current.x; const dy = e.touches[0].clientY - lastMouse.current.y; position.current.x += dx; position.current.y += dy; velocity.current = { x: dx, y: dy }; lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } }}
                        onTouchEnd={() => { isDragging.current = false; setIsGrabbing(false); }}
                        onWheel={(e) => { velocity.current.x -= e.deltaX * 0.1; velocity.current.y -= e.deltaY * 0.1; }}
                    >
                        <div ref={containerRef} className="w-full h-full pointer-events-none overflow-visible">
                            {itemPositions?.map((pos) => (
                                <div key={pos.id} className="absolute flex items-center justify-center overflow-visible" style={{ width: `${ITEM_WIDTH}px`, top: 0, left: 0, willChange: 'transform' }}>
                                    <Card image={pos.image} aspectRatio="auto" />
                                </div>
                            ))}
                        </div>
                        <div className="absolute bottom-10 left-0 w-full text-center text-[var(--content-tertiary)] pointer-events-none select-none label-s">
                            drag/scroll to explore
                        </div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}

const loaderVariants = {
    initial: { opacity: 0 },
    animate: (delay: number) => ({
        opacity: 1,
        transition: { delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] as const }
    }),
    exit: { opacity: 0, transition: { duration: 0.3 } }
};

const Loader = memo(({ percent, delay }: { percent: number; delay: number }) => (
    <motion.div
        variants={loaderVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        custom={delay}
        className="flex flex-col items-center gap-4 w-full max-w-[400px] p-1 bg-[var(--background-secondary)] rounded-full"
    >
        <div className="w-full h-[8px] bg-[var(--background-secondary)] rounded-full overflow-hidden">
            <div
                className="h-full bg-[var(--content-primary)] rounded-full transition-all duration-150 ease-out"
                style={{ width: `${percent}%`, minWidth: "8px" }}
            />
        </div>
    </motion.div>
));

Loader.displayName = "Loader";