"use client";

import { useRef, useEffect, useState, useMemo, useCallback, memo } from "react";
import Card from "@/components/interface/Card";
import archive from "@/data/archive.json";
import { AnimatePresence, motion } from "motion/react";

const GAP = 32;
const CURSOR_GRAB = "url('/cursors/Cursor Grab.png') 12 12, grab";
const CURSOR_GRABBED = "url('/cursors/Cursor Grabbed.png') 12 12, grabbing";
const MIN_COLS = 4;

// === TYPES ===

type ArchiveItem = (typeof archive)[number];

type LoadedAsset = {
    id: string;
    url: string;
    width: number;
    height: number;
    isVideo: boolean;
    error?: boolean;
};

type AssetPosition = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    url: string;
    colIndex: number;
};

// === UTILITIES ===

const isVideoUrl = (url: string): boolean => {
    const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".ogv"];
    return videoExtensions.some((ext) => url.toLowerCase().includes(ext));
};

/**
 * Fetch a resource as a blob with progress tracking.
 * Uses a single request (no HEAD) to avoid round trips.
 */
async function fetchAsBlob(
    url: string,
    onProgress?: (loaded: number, total: number) => void
): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

    const contentLength = parseInt(
        response.headers.get("content-length") || "0",
        10
    );
    if (!response.body) {
        const blob = await response.blob();
        onProgress?.(blob.size, blob.size);
        return blob;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            loaded += value.length;
            onProgress?.(loaded, contentLength || loaded);
        }
    } catch (err) {
        reader.cancel();
        throw err;
    }

    return new Blob(chunks);
}

/**
 * Get dimensions from a blob URL.
 * For images: decode via Image.
 * For videos: create video element and measure.
 */
async function measureAsset(
    blobUrl: string,
    isVideo: boolean
): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        if (isVideo) {
            const video = document.createElement("video");
            video.onloadedmetadata = () => {
                resolve({
                    width: video.videoWidth,
                    height: video.videoHeight,
                });
                video.remove();
            };
            video.onerror = () => {
                video.remove();
                reject(new Error("Video measurement failed"));
            };
            video.src = blobUrl;
        } else {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
                img.remove();
            };
            img.onerror = () => {
                img.remove();
                reject(new Error("Image measurement failed"));
            };
            img.src = blobUrl;
        }
    });
}

/**
 * Load and measure a single asset.
 * Returns dimensions in a normalized format.
 */
async function loadAsset(
    item: ArchiveItem,
    onProgress?: (loaded: number, total: number) => void
): Promise<LoadedAsset> {
    try {
        const blob = await fetchAsBlob(item.image, onProgress);
        const blobUrl = URL.createObjectURL(blob);

        try {
            const { width, height } = await measureAsset(
                blobUrl,
                isVideoUrl(item.image)
            );

            return {
                id: item.id,
                url: blobUrl,
                width,
                height,
                isVideo: isVideoUrl(item.image),
            };
        } catch (err) {
            console.error(`Measurement failed for ${item.id}:`, err);
            // Fallback: assume square
            URL.revokeObjectURL(blobUrl);
            return {
                id: item.id,
                url: item.image,
                width: 400,
                height: 400,
                isVideo: isVideoUrl(item.image),
                error: true,
            };
        }
    } catch (err) {
        console.error(`Load failed for ${item.id}:`, err);
        return {
            id: item.id,
            url: item.image,
            width: 400,
            height: 400,
            isVideo: isVideoUrl(item.image),
            error: true,
        };
    }
}

// === MAIN COMPONENT ===

export default function ArchiveContent() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isGrabbing, setIsGrabbing] = useState(false);

    // Loading state: track total bytes and loaded bytes
    const [loadingState, setLoadingState] = useState<{
        isLoading: boolean;
        loaded: number;
        total: number;
    }>({
        isLoading: true,
        loaded: 0,
        total: 0,
    });

    // All loaded assets (populated once all measuring is complete)
    const [loadedAssets, setLoadedAssets] = useState<LoadedAsset[]>([]);

    // Refs for drag/pan interaction
    const position = useRef({ x: 0, y: 0 });
    const velocity = useRef({ x: 0, y: 0 });
    const lastMouse = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Load all assets (fetch + measure)
    useEffect(() => {
        let cancelled = false;
        let totalBytes = 0;
        let loadedBytes = 0;

        const loadAll = async () => {
            const promises = archive.map((item, index) =>
                loadAsset(item, (loaded, total) => {
                    // Update progress
                    if (total > 0) {
                        totalBytes = Math.max(totalBytes, total);
                        loadedBytes += loaded;
                        if (!cancelled) {
                            setLoadingState((prev) => ({
                                ...prev,
                                loaded: loadedBytes,
                                total: totalBytes,
                            }));
                        }
                    }
                })
            );

            try {
                const assets = await Promise.all(promises);
                if (!cancelled) {
                    setLoadedAssets(assets);
                    // Delay hiding the loader slightly for polish
                    setTimeout(() => {
                        if (!cancelled) {
                            setLoadingState((prev) => ({
                                ...prev,
                                isLoading: false,
                            }));
                        }
                    }, 200);
                }
            } catch (err) {
                console.error("Asset loading failed:", err);
                if (!cancelled) {
                    setLoadingState((prev) => ({
                        ...prev,
                        isLoading: false,
                    }));
                }
            }
        };

        loadAll();
        return () => {
            cancelled = true;
        };
    }, []);

    // Cleanup blob URLs on unmount or when assets change
    useEffect(() => {
        return () => {
            loadedAssets.forEach((asset) => {
                if (asset.url.startsWith("blob:")) {
                    URL.revokeObjectURL(asset.url);
                }
            });
        };
    }, [loadedAssets]);

    // Calculate layout
    const ITEM_WIDTH = isMobile ? 250 : 400;
    const COLS = Math.max(MIN_COLS, Math.ceil(Math.sqrt(archive.length)));

    const positions = useMemo<AssetPosition[] | null>(() => {
        if (loadedAssets.length === 0) return null;

        // Build masonry layout
        const columnHeights: number[] = Array(COLS).fill(0);
        const positions: AssetPosition[] = [];

        loadedAssets.forEach((asset) => {
            // Find the shortest column
            const colIndex = columnHeights.indexOf(Math.min(...columnHeights));
            const x = colIndex * (ITEM_WIDTH + GAP);
            const y = columnHeights[colIndex];

            // Scale height to match ITEM_WIDTH
            const scaledHeight = (asset.height / asset.width) * ITEM_WIDTH;

            positions.push({
                id: asset.id,
                x,
                y,
                width: ITEM_WIDTH,
                height: scaledHeight,
                url: asset.url,
                colIndex,
            });

            columnHeights[colIndex] += scaledHeight + GAP;
        });

        return positions;
    }, [loadedAssets, ITEM_WIDTH, COLS]);

    // Calculate total dimensions
    const dimensions = useMemo(() => {
        if (!positions || positions.length === 0) {
            return { width: 0, height: 0, columnHeights: Array(COLS).fill(0) };
        }

        const columnHeights: number[] = Array(COLS).fill(0);
        positions.forEach((pos) => {
            columnHeights[pos.colIndex] = Math.max(
                columnHeights[pos.colIndex],
                pos.y + pos.height + GAP
            );
        });

        return {
            width: COLS * (ITEM_WIDTH + GAP),
            height: Math.max(...columnHeights),
            columnHeights,
        };
    }, [positions, COLS, ITEM_WIDTH]);

    // Initialize position (center content)
    useEffect(() => {
        if (dimensions.width > 0 && dimensions.height > 0) {
            position.current = {
                x: (window.innerWidth - dimensions.width) / 2,
                y: (window.innerHeight - dimensions.height) / 2,
            };
        }
    }, [dimensions]);

    // Animation loop
    useEffect(() => {
        if (!positions || positions.length === 0) return;

        const { width: TOTAL_WIDTH } = dimensions;

        const loop = () => {
            // Apply friction
            if (!isDragging.current) {
                velocity.current.x *= 0.92;
                velocity.current.y *= 0.92;
                position.current.x += velocity.current.x;
                position.current.y += velocity.current.y;
            }

            // Update transforms
            if (containerRef.current) {
                const children = containerRef.current.children;
                for (let i = 0; i < children.length; i++) {
                    const item = children[i] as HTMLElement;
                    const pos = positions[i];
                    if (!pos) continue;

                    const colHeight =
                        dimensions.columnHeights[pos.colIndex] || 0;
                    let currentX = (pos.x + position.current.x) % TOTAL_WIDTH;
                    let currentY = (pos.y + position.current.y) % colHeight;

                    if (currentX < 0) currentX += TOTAL_WIDTH;
                    if (currentY < 0) currentY += colHeight;
                    if (currentX > TOTAL_WIDTH - ITEM_WIDTH)
                        currentX -= TOTAL_WIDTH;
                    if (currentY > colHeight - pos.height)
                        currentY -= colHeight;

                    item.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
                }
            }

            requestAnimationFrame(loop);
        };

        const id = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(id);
    }, [positions, dimensions, ITEM_WIDTH]);

    // Event handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        velocity.current = { x: 0, y: 0 };
        setIsGrabbing(true);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        position.current.x += dx;
        position.current.y += dy;
        velocity.current = { x: dx, y: dy };
        lastMouse.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseEnd = useCallback(() => {
        isDragging.current = false;
        setIsGrabbing(false);
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        isDragging.current = true;
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        velocity.current = { x: 0, y: 0 };
        setIsGrabbing(true);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging.current) return;
        const dx = e.touches[0].clientX - lastMouse.current.x;
        const dy = e.touches[0].clientY - lastMouse.current.y;
        position.current.x += dx;
        position.current.y += dy;
        velocity.current = { x: dx, y: dy };
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, []);

    const handleTouchEnd = useCallback(() => {
        isDragging.current = false;
        setIsGrabbing(false);
    }, []);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        velocity.current.x -= e.deltaX * 0.1;
        velocity.current.y -= e.deltaY * 0.1;
    }, []);

    const percent =
        loadingState.total > 0
            ? Math.min(100, (loadingState.loaded / loadingState.total) * 100)
            : 0;

    return (
        <AnimatePresence mode="wait">
            {loadingState.isLoading ? (
                <div
                    key="loader"
                    className="w-full h-full flex items-center justify-center p-4"
                >
                    <Loader percent={percent} />
                </div>
            ) : (
                <div key="content" className="w-full h-full">
                    <style>{`
                        .archive-grab-cursor, .archive-grab-cursor * { cursor: ${CURSOR_GRAB} !important; }
                        .archive-grabbed-cursor, .archive-grabbed-cursor * { cursor: ${CURSOR_GRABBED} !important; }
                    `}</style>
                    <div
                        className={`w-full h-full overflow-visible relative touch-none ${
                            isGrabbing
                                ? "archive-grabbed-cursor"
                                : "archive-grab-cursor"
                        }`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseEnd}
                        onMouseLeave={handleMouseEnd}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onWheel={handleWheel}
                    >
                        <div
                            ref={containerRef}
                            className="w-full h-full pointer-events-none overflow-visible"
                        >
                            {positions?.map((pos) => (
                                <div
                                    key={pos.id}
                                    className="absolute flex items-center justify-center overflow-visible"
                                    style={{
                                        width: `${pos.width}px`,
                                        height: `${pos.height}px`,
                                        top: 0,
                                        left: 0,
                                        willChange: "transform",
                                    }}
                                >
                                    <Card image={pos.url} aspectRatio="auto" />
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

// === LOADER COMPONENT ===

const loaderVariants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { delay: 0.3, duration: 0.5, ease: [0.23, 1, 0.32, 1] },
    },
    exit: { opacity: 0, transition: { duration: 0.3 } },
};

const Loader = memo(({ percent }: { percent: number }) => (
    <motion.div
        variants={loaderVariants}
        initial="initial"
        animate="animate"
        exit="exit"
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