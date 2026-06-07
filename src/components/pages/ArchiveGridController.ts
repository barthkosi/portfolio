import Konva from "konva";
import archiveData from "@/data/archive.json";
import {
    GAP,
    MAX_SCALE,
    DRAG_DECELERATION,
    TAPPING_DECELERATION,
    WHEEL_IMPULSE,
    CLICK_MOVE_THRESHOLD,
    OPEN_CENTER_THRESHOLD,
    OPEN_AFTER_CENTER_DELAY,
    TRACKPAD_ZOOM_SENSITIVITY,
    TRACKPAD_PINCH_ZOOM_SENSITIVITY,
    TOUCH_PINCH_SENSITIVITY,
    SCALE_EASING,
    TRACKPAD_PINCH_END_DELAY,
    MAX_KONVA_PIXEL_RATIO,
    IMAGE_LOAD_START_DELAY,
    IMAGE_LOAD_RESUME_DELAY,
    CONTEXT_IMAGE_SRC_ATTRIBUTE,
    CURSOR_GRAB,
    CURSOR_GRABBED,
    clamp,
    positiveModulo,
    getItemWidth,
    getMinScale,
    getShortestColumnIndex,
    getTouchDistance,
    getTouchCenter,
    isMultiTouchEvent,
    isTouchEvent,
    isolateTouchEvent,
    stopTouchPropagation,
    normalizeWheelDelta,
    intersectsViewport,
    getOptimizedImageSrc,
    getImageRequestWidth,
    MAX_CONCURRENT_IMAGE_LOADS,
    INTERACTION_CONCURRENT_IMAGE_LOADS,
    MOBILE_BREAKPOINT,
    Point,
    ArchiveItem,
    Tile,
    LoadCandidate,
    ActiveArchiveTile,
    OpenArchiveImage,
} from "./archiveUtils";

const archive = archiveData as ArchiveItem[];
const archiveImageCache = new Map<string, Promise<HTMLImageElement>>();

export interface ArchiveGridControllerOptions {
    container: HTMLDivElement;
    onSceneReady: (ready: boolean) => void;
    onActiveTileChange: (tile: ActiveArchiveTile | null) => void;
    onOpenTile: (openTile: OpenArchiveImage) => void;
    setIsOpenImageLoaded: (loaded: boolean) => void;
}

export class ArchiveGridController {
    private container: HTMLDivElement;
    private onSceneReady: (ready: boolean) => void;
    private onActiveTileChange: (tile: ActiveArchiveTile | null) => void;
    private onOpenTile: (openTile: OpenArchiveImage) => void;
    private setIsOpenImageLoaded: (loaded: boolean) => void;

    private stage: Konva.Stage;
    private layer: Konva.Layer;
    private isDestroyed = false;
    private previousPixelRatio: number;

    // Layout config and items
    private itemWidth: number;
    private minScale: number;
    private imageRequestWidth: number;
    private totalWidth = 0;
    private colHeights: number[] = [];
    private tiles: Tile[] = [];
    private tileGeneration = 0;
    private hasCenteredInitialView = false;

    // Movement/Physics offsets
    private offset: Point = { x: 0, y: 0 };
    private velocity: Point = { x: 0, y: 0 };
    private momentumTargetOffset: Point | null = null;
    private scale = 1;
    private targetScale = 1;
    private zoomAnchorPoint: Point | null = null;

    // Pointer/Drag states
    private isDragging = false;
    private hasDraggedSincePointerStart = false;
    private lastPointer: Point = { x: 0, y: 0 };
    private pointerStart: Point = { x: 0, y: 0 };

    // Animation Frame IDs
    private animationFrameId: number | null = null;
    private renderFrameId: number | null = null;
    private sceneRevealFrameId: number | null = null;
    private sceneRevealSettleFrameId: number | null = null;

    // Trackpad Pinch Gesture Zoom
    private trackpadPinchStartScale = 1;
    private accumulatedTrackpadPinchDelta = 0;
    private trackpadPinchTimeout: ReturnType<typeof setTimeout> | null = null;
    private isControlKeyPressed = false;
    private pinchStartDistance = 0;
    private pinchStartScale = 1;

    // Image loading queue variables
    private imageLoadQueue: Tile[] = [];
    private activeImageLoads = 0;
    private imageLoadTimer: ReturnType<typeof setTimeout> | null = null;
    private imageLoadResumeTimer: ReturnType<typeof setTimeout> | null = null;
    private openAfterCenterTimer: ReturnType<typeof setTimeout> | null = null;
    private isInteractionActive = false;
    private hasRevealedScene = false;

    // Active tile state
    private activeTile: Tile | null = null;
    private activeTileClearTimer: ReturnType<typeof setTimeout> | null = null;
    private isActiveTileControlHovered = false;

    constructor(options: ArchiveGridControllerOptions) {
        this.container = options.container;
        this.onSceneReady = options.onSceneReady;
        this.onActiveTileChange = options.onActiveTileChange;
        this.onOpenTile = options.onOpenTile;
        this.setIsOpenImageLoaded = options.setIsOpenImageLoaded;

        // Setup pixel ratio
        this.previousPixelRatio = Konva.pixelRatio;
        Konva.pixelRatio = Math.min(
            window.devicePixelRatio || 1,
            MAX_KONVA_PIXEL_RATIO
        );

        this.itemWidth = getItemWidth();
        this.minScale = getMinScale(this.itemWidth);
        this.imageRequestWidth = getImageRequestWidth(this.itemWidth);

        // Instantiate Stage and Layer
        this.stage = new Konva.Stage({
            container: this.container,
            width: window.innerWidth,
            height: window.innerHeight,
        });

        this.layer = new Konva.Layer({ listening: false });
        this.stage.add(this.layer);

        this.setupEventListeners();
        this.buildTiles();
    }

    private setupEventListeners() {
        this.stage.on("mousedown touchstart", this.handlePointerStart);
        this.stage.on("mousemove touchmove", this.handlePointerMove);
        this.stage.on("mouseup mouseleave touchend touchcancel", this.handlePointerEnd);
        this.stage.on("wheel", this.handleWheel);

        this.container.addEventListener("touchstart", this.handleContainerTouchStart, {
            passive: false,
        });
        this.container.addEventListener("touchend", this.handleContainerTouchEnd, {
            passive: false,
        });
        this.container.addEventListener("touchcancel", this.handleContainerTouchEnd, {
            passive: false,
        });
        this.container.addEventListener("mousemove", this.handleMouseMove);
        this.container.addEventListener("mouseleave", this.handleMouseLeave);
        this.container.addEventListener("touchend", this.handlePinchEnd);
        this.container.addEventListener("touchcancel", this.handlePinchEnd);
        this.container.addEventListener("contextmenu", this.handleContextMenu);

        window.addEventListener("resize", this.handleResize);
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
        window.addEventListener("blur", this.handleWindowBlur);

        this.container.style.cursor = CURSOR_GRAB;
    }

    private removeEventListeners() {
        this.stage.off("mousedown touchstart", this.handlePointerStart);
        this.stage.off("mousemove touchmove", this.handlePointerMove);
        this.stage.off("mouseup mouseleave touchend touchcancel", this.handlePointerEnd);
        this.stage.off("wheel", this.handleWheel);

        this.container.removeEventListener("touchstart", this.handleContainerTouchStart);
        this.container.removeEventListener("touchend", this.handleContainerTouchEnd);
        this.container.removeEventListener("touchcancel", this.handleContainerTouchEnd);
        this.container.removeEventListener("mousemove", this.handleMouseMove);
        this.container.removeEventListener("mouseleave", this.handleMouseLeave);
        this.container.removeEventListener("touchend", this.handlePinchEnd);
        this.container.removeEventListener("touchcancel", this.handlePinchEnd);
        this.container.removeEventListener("contextmenu", this.handleContextMenu);

        window.removeEventListener("resize", this.handleResize);
        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
        window.removeEventListener("blur", this.handleWindowBlur);
    }

    /* ------------------------------------------------------------------ */
    /*                                Layout                              */
    /* ------------------------------------------------------------------ */

    private getRequiredColumnCount = () => {
        const visibleWidthAtMinScale = this.stage.width() / this.minScale;
        return Math.ceil(visibleWidthAtMinScale / (this.itemWidth + GAP)) + 2;
    };

    private getRequiredColumnHeight = () => {
        const visibleHeightAtMinScale = this.stage.height() / this.minScale;
        const tallestItemHeight = archive.reduce(
            (height, item) =>
                Math.max(height, this.itemWidth * item.aspectRatio),
            0
        );

        return visibleHeightAtMinScale + tallestItemHeight + GAP * 4;
    };

    private clearTiles = () => {
        this.imageLoadQueue.length = 0;

        for (const tile of this.tiles) {
            tile.placeholder.destroy();
            tile.imageNode?.destroy();
        }

        this.tiles.length = 0;
    };

    private createTile = (item: ArchiveItem) => {
        const colIndex = getShortestColumnIndex(this.colHeights);
        const width = this.itemWidth;
        const height = width * item.aspectRatio;
        const baseX = colIndex * (this.itemWidth + GAP);
        const baseY = this.colHeights[colIndex];

        const placeholder = new Konva.Rect({
            x: baseX,
            y: baseY,
            width,
            height,
            fill: item.color || "#111111",
            listening: false,
            perfectDrawEnabled: false,
        });

        this.layer.add(placeholder);

        this.tiles.push({
            item,
            placeholder,
            imageNode: null,
            imageElement: null,
            loadState: "idle",
            generation: this.tileGeneration,
            baseX,
            baseY,
            width,
            height,
            colIndex,
            renderedX: null,
            renderedY: null,
            renderedScale: null,
        });

        this.colHeights[colIndex] += height + GAP;
    };

    private centerInitialView = () => {
        if (this.hasCenteredInitialView || this.tiles.length === 0) return;

        const firstTile = this.tiles[0];

        this.offset.x =
            this.stage.width() / (2 * this.scale) -
            firstTile.baseX -
            firstTile.width / 2;

        this.offset.y =
            this.stage.height() / (2 * this.scale) -
            firstTile.baseY -
            firstTile.height / 2;

        this.hasCenteredInitialView = true;
    };

    private revealScene = () => {
        if (this.hasRevealedScene) return;

        this.hasRevealedScene = true;

        this.sceneRevealFrameId = requestAnimationFrame(() => {
            this.sceneRevealFrameId = null;

            this.sceneRevealSettleFrameId = requestAnimationFrame(() => {
                this.sceneRevealSettleFrameId = null;

                if (!this.isDestroyed) this.onSceneReady(true);
            });
        });
    };

    private buildTiles = () => {
        this.tileGeneration += 1;
        this.clearTiles();

        const columnCount = this.getRequiredColumnCount();

        this.totalWidth = columnCount * (this.itemWidth + GAP);
        this.colHeights = Array(columnCount).fill(0);

        if (archive.length > 0) {
            const requiredColumnHeight = this.getRequiredColumnHeight();

            while (
                this.colHeights.some(
                    (columnHeight) =>
                        columnHeight < requiredColumnHeight
                )
            ) {
                for (const item of archive) {
                    this.createTile(item);
                }
            }
        }

        this.centerInitialView();
        this.applyTransforms();
        this.revealScene();
    };

    /* ------------------------------------------------------------------ */
    /*                                Images                              */
    /* ------------------------------------------------------------------ */

    private loadImage = (src: string) => {
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

    private loadTileImage = async (tile: Tile) => {
        if (tile.loadState !== "queued") return;

        tile.loadState = "loading";
        const generation = this.tileGeneration;

        try {
            const image = await this.loadImage(
                getOptimizedImageSrc(tile.item.image, this.imageRequestWidth)
            );

            if (this.isDestroyed || generation !== this.tileGeneration) return;

            tile.imageElement = image;
            tile.imageNode = new Konva.Image({
                image,
                x: tile.renderedX ?? 0,
                y: tile.renderedY ?? 0,
                width: tile.width,
                height: tile.height,
                scaleX: tile.renderedScale ?? this.scale,
                scaleY: tile.renderedScale ?? this.scale,
                opacity: 0,
                listening: false,
                perfectDrawEnabled: false,
            });

            this.layer.add(tile.imageNode);
            tile.loadState = "loaded";

            tile.imageNode.to({
                opacity: 1,
                duration: 0.18,
            });

            this.requestRender();
        } catch {
            if (this.isDestroyed || generation !== this.tileGeneration) return;

            tile.loadState = "error";
        }
    };

    private getTileDistanceFromViewportCenter = (tile: Tile) => {
        if (
            tile.renderedX === null ||
            tile.renderedY === null ||
            tile.renderedScale === null
        ) {
            return Number.POSITIVE_INFINITY;
        }

        const viewportCenterX = this.stage.width() / 2;
        const viewportCenterY = this.stage.height() / 2;
        const screenWidth = tile.width * tile.renderedScale;
        const screenHeight = tile.height * tile.renderedScale;

        return Math.hypot(
            tile.renderedX + screenWidth / 2 - viewportCenterX,
            tile.renderedY + screenHeight / 2 - viewportCenterY
        );
    };

    private sortImageLoadQueue = () => {
        this.imageLoadQueue.sort(
            (a, b) =>
                this.getTileDistanceFromViewportCenter(a) -
                this.getTileDistanceFromViewportCenter(b)
        );
    };

    private getImageLoadLimit = () =>
        this.isInteractionActive
            ? INTERACTION_CONCURRENT_IMAGE_LOADS
            : MAX_CONCURRENT_IMAGE_LOADS;

    private processImageLoadQueue = () => {
        const imageLoadLimit = this.getImageLoadLimit();

        if (this.activeImageLoads >= imageLoadLimit) return;

        this.sortImageLoadQueue();

        while (
            this.activeImageLoads < imageLoadLimit &&
            this.imageLoadQueue.length > 0
        ) {
            const tile = this.imageLoadQueue.shift();

            if (!tile) continue;

            if (
                this.isDestroyed ||
                tile.generation !== this.tileGeneration ||
                tile.loadState !== "queued"
            ) {
                continue;
            }

            this.activeImageLoads += 1;

            void this.loadTileImage(tile).finally(() => {
                this.activeImageLoads -= 1;
                this.processImageLoadQueue();
            });
        }
    };

    private scheduleImageLoadProcessing = () => {
        if (this.imageLoadTimer !== null) return;

        this.imageLoadTimer = setTimeout(() => {
            this.imageLoadTimer = null;
            this.processImageLoadQueue();
        }, IMAGE_LOAD_START_DELAY);
    };

    private queueTileImages = (candidates: LoadCandidate[]) => {
        if (candidates.length === 0) return;

        candidates.sort(
            (a, b) => a.distanceFromCenter - b.distanceFromCenter
        );

        for (const { tile } of candidates) {
            if (tile.loadState !== "idle") continue;

            tile.loadState = "queued";
            this.imageLoadQueue.push(tile);
        }

        this.sortImageLoadQueue();
        this.scheduleImageLoadProcessing();
    };

    /* ------------------------------------------------------------------ */
    /*                              Rendering                             */
    /* ------------------------------------------------------------------ */

    private applyTransforms = () => {
        const viewportWidth = this.stage.width();
        const viewportHeight = this.stage.height();
        const viewportCenterX = viewportWidth / 2;
        const viewportCenterY = viewportHeight / 2;
        const loadCandidates: LoadCandidate[] = [];

        for (const tile of this.tiles) {
            const {
                placeholder,
                imageNode,
                baseX,
                baseY,
                width,
                height,
                colIndex,
            } = tile;

            const colHeight = this.colHeights[colIndex];

            if (!colHeight) continue;

            let x = positiveModulo(baseX + this.offset.x, this.totalWidth);
            let y = positiveModulo(baseY + this.offset.y, colHeight);

            if (x > this.totalWidth - width) x -= this.totalWidth;
            if (y > colHeight - height) y -= colHeight;

            const screenX = x * this.scale;
            const screenY = y * this.scale;
            const screenWidth = width * this.scale;
            const screenHeight = height * this.scale;

            const hasMoved =
                tile.renderedX !== screenX || tile.renderedY !== screenY;
            const hasScaled = tile.renderedScale !== this.scale;

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
                    x: this.scale,
                    y: this.scale,
                };

                placeholder.scale(nodeScale);

                if (imageNode) {
                    imageNode.scale(nodeScale);
                }
            }

            tile.renderedX = screenX;
            tile.renderedY = screenY;
            tile.renderedScale = this.scale;

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

        this.queueTileImages(loadCandidates);
        this.syncActiveTileBounds();
        this.layer.batchDraw();
    };

    private requestRender = () => {
        if (this.renderFrameId !== null) return;

        this.renderFrameId = requestAnimationFrame(() => {
            this.renderFrameId = null;
            this.applyTransforms();
        });
    };

    private zoomToPoint = (nextScale: number, point: Point) => {
        this.offset.x += point.x * (1 / nextScale - 1 / this.scale);
        this.offset.y += point.y * (1 / nextScale - 1 / this.scale);
        this.scale = nextScale;
    };

    private getPointerZoomPoint = (): Point =>
        this.stage.getPointerPosition() ?? {
            x: this.stage.width() / 2,
            y: this.stage.height() / 2,
        };

    private getZoomPoint = (): Point =>
        this.zoomAnchorPoint ?? this.getPointerZoomPoint();

    private getTileAtPoint = (point: Point) => {
        for (let index = this.tiles.length - 1; index >= 0; index--) {
            const tile = this.tiles[index];

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

    private getTileScreenBounds = (tile: Tile): ActiveArchiveTile | null => {
        if (
            tile.renderedX === null ||
            tile.renderedY === null ||
            tile.renderedScale === null
        ) {
            return null;
        }

        const containerBounds = this.container.getBoundingClientRect();

        return {
            image: tile.item.image,
            previewImage:
                tile.imageElement?.src ||
                getOptimizedImageSrc(tile.item.image, this.imageRequestWidth),
            x: containerBounds.left + tile.renderedX,
            y: containerBounds.top + tile.renderedY,
            width: tile.width * tile.renderedScale,
            height: tile.height * tile.renderedScale,
            naturalWidth: tile.item.width,
            naturalHeight: tile.item.height,
        };
    };

    private setActiveTileFromTile = (tile: Tile | null) => {
        if (this.activeTileClearTimer !== null) {
            clearTimeout(this.activeTileClearTimer);
            this.activeTileClearTimer = null;
        }

        this.activeTile = tile;

        if (!tile) {
            this.onActiveTileChange(null);
            return;
        }

        this.onActiveTileChange(this.getTileScreenBounds(tile));
    };

    private syncActiveTileBounds = () => {
        const tile = this.activeTile;
        if (!tile) return;

        const bounds = this.getTileScreenBounds(tile);

        if (!bounds) {
            this.setActiveTileFromTile(null);
            return;
        }

        const isVisible =
            bounds.x + bounds.width >= 0 &&
            bounds.x <= this.stage.width() &&
            bounds.y + bounds.height >= 0 &&
            bounds.y <= this.stage.height();

        this.onActiveTileChange(isVisible ? bounds : null);
    };

    private centerTile = (tile: Tile) => {
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
            x: this.offset.x + (this.stage.width() / 2 - tileCenterX) / this.scale,
            y: this.offset.y + (this.stage.height() / 2 - tileCenterY) / this.scale,
        };
        const dx = nextOffset.x - this.offset.x;
        const dy = nextOffset.y - this.offset.y;
        const impulseScale = (1 - TAPPING_DECELERATION) / TAPPING_DECELERATION;

        this.pauseImageLoading();
        this.stopAnimation();
        this.zoomAnchorPoint = null;
        this.momentumTargetOffset = nextOffset;
        this.velocity = {
            x: dx * impulseScale,
            y: dy * impulseScale,
        };
        this.startAnimation();
    };

    private isTileCentered = (tile: Tile) => {
        if (
            tile.renderedX === null ||
            tile.renderedY === null ||
            tile.renderedScale === null
        ) {
            return true;
        }

        const tileCenterX =
            tile.renderedX + (tile.width * tile.renderedScale) / 2;
        const tileCenterY =
            tile.renderedY + (tile.height * tile.renderedScale) / 2;

        return (
            Math.abs(tileCenterX - this.stage.width() / 2) <=
                OPEN_CENTER_THRESHOLD &&
            Math.abs(tileCenterY - this.stage.height() / 2) <=
                OPEN_CENTER_THRESHOLD
        );
    };

    private openTileFromCurrentBounds = (tile: Tile) => {
        const bounds = this.getTileScreenBounds(tile);

        if (!bounds) return;

        this.setIsOpenImageLoaded(false);
        this.onOpenTile({
            image: bounds.image,
            previewImage: bounds.previewImage,
            origin: {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
            },
            naturalWidth: bounds.naturalWidth,
            naturalHeight: bounds.naturalHeight,
        });
    };

    public openActiveTile = () => {
        const tile = this.activeTile;

        if (!tile) return;

        if (this.isTileCentered(tile)) {
            this.openTileFromCurrentBounds(tile);
            return;
        }

        this.centerTile(tile);
        if (this.openAfterCenterTimer !== null) {
            clearTimeout(this.openAfterCenterTimer);
        }

        this.openAfterCenterTimer = setTimeout(() => {
            this.openAfterCenterTimer = null;
            this.openTileFromCurrentBounds(tile);
        }, OPEN_AFTER_CENTER_DELAY);
    };

    public setTileImageOpacity = (imageUrl: string, opacity: number) => {
        const tile = this.tiles.find((t) => t.item.image === imageUrl);
        if (tile) {
            if (tile.imageNode) {
                tile.imageNode.opacity(opacity);
            }
            tile.placeholder.opacity(opacity);
            this.layer.batchDraw();
        }
    };

    public setActiveTileControlHovered = (hovered: boolean) => {
        this.isActiveTileControlHovered = hovered;
        if (hovered) {
            if (this.activeTileClearTimer !== null) {
                clearTimeout(this.activeTileClearTimer);
                this.activeTileClearTimer = null;
            }
        } else {
            this.activeTile = null;
            this.onActiveTileChange(null);
        }
    };

    /* ------------------------------------------------------------------ */
    /*                              Animation                             */
    /* ------------------------------------------------------------------ */

    private animate = () => {
        let shouldContinue = false;

        if (Math.abs(this.targetScale - this.scale) > 0.0001) {
            const nextScale =
                this.scale + (this.targetScale - this.scale) * SCALE_EASING;

            this.zoomToPoint(nextScale, this.getZoomPoint());
            shouldContinue = true;
        }

        if (
            Math.abs(this.velocity.x) >= 0.01 ||
            Math.abs(this.velocity.y) >= 0.01
        ) {
            const deceleration = this.momentumTargetOffset
                ? TAPPING_DECELERATION
                : DRAG_DECELERATION;
            this.velocity.x *= deceleration;
            this.velocity.y *= deceleration;

            this.offset.x += this.velocity.x;
            this.offset.y += this.velocity.y;

            shouldContinue = true;
        } else {
            this.velocity = { x: 0, y: 0 };

            if (this.momentumTargetOffset) {
                this.offset.x = this.momentumTargetOffset.x;
                this.offset.y = this.momentumTargetOffset.y;
                this.momentumTargetOffset = null;
            }
        }

        this.applyTransforms();

        if (!shouldContinue) {
            this.zoomAnchorPoint = null;
            this.resumeImageLoadingSoon();
        }

        this.animationFrameId = shouldContinue
            ? requestAnimationFrame(this.animate)
            : null;
    };

    private startAnimation = () => {
        if (this.animationFrameId !== null) return;
        this.animationFrameId = requestAnimationFrame(this.animate);
    };

    private stopAnimation = () => {
        if (this.animationFrameId === null) return;

        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    };

    private pauseImageLoading = () => {
        this.isInteractionActive = true;

        if (this.imageLoadResumeTimer !== null) {
            clearTimeout(this.imageLoadResumeTimer);
            this.imageLoadResumeTimer = null;
        }
    };

    private resumeImageLoadingSoon = () => {
        if (this.imageLoadResumeTimer !== null) {
            clearTimeout(this.imageLoadResumeTimer);
        }

        this.imageLoadResumeTimer = setTimeout(() => {
            this.imageLoadResumeTimer = null;
            this.isInteractionActive = false;
            this.scheduleImageLoadProcessing();
        }, IMAGE_LOAD_RESUME_DELAY);
    };

    /* ------------------------------------------------------------------ */
    /*                                Input                               */
    /* ------------------------------------------------------------------ */

    private handlePinchMove = (event: TouchEvent) => {
        isolateTouchEvent(event);

        if (event.touches.length !== 2) return;

        this.pauseImageLoading();
        this.stopAnimation();
        this.momentumTargetOffset = null;
        this.velocity = { x: 0, y: 0 };
        this.isDragging = false;

        const distance = getTouchDistance(event.touches);

        if (!this.pinchStartDistance) {
            this.pinchStartDistance = distance;
            this.pinchStartScale = this.targetScale;
            this.zoomAnchorPoint = getTouchCenter(event.touches);
            return;
        }

        const gestureRatio = distance / this.pinchStartDistance;

        const nextScale = clamp(
            this.pinchStartScale *
                Math.pow(gestureRatio, TOUCH_PINCH_SENSITIVITY),
            this.minScale,
            MAX_SCALE
        );

        this.targetScale = nextScale;
        this.zoomAnchorPoint = getTouchCenter(event.touches);
        this.startAnimation();
    };

    private handlePinchEnd = () => {
        this.pinchStartDistance = 0;
        this.pinchStartScale = this.targetScale;
        this.startAnimation();
    };

    private handlePointerStart = (
        event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
    ) => {
        if (event.evt instanceof MouseEvent && event.evt.button !== 0) {
            return;
        }

        if (isTouchEvent(event.evt)) {
            isolateTouchEvent(event.evt);
        }

        if (isMultiTouchEvent(event.evt)) {
            this.isDragging = false;
            return;
        }

        this.setActiveTileFromTile(null);
        this.pauseImageLoading();
        this.isDragging = true;
        this.hasDraggedSincePointerStart = false;
        this.zoomAnchorPoint = null;
        this.stopAnimation();
        this.momentumTargetOffset = null;

        const pointer = this.stage.getPointerPosition();
        if (!pointer) return;

        this.lastPointer = pointer;
        this.pointerStart = pointer;
        this.velocity = { x: 0, y: 0 };

        this.container.style.cursor = CURSOR_GRABBED;
    };

    private handlePointerMove = (
        event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
    ) => {
        if (isTouchEvent(event.evt)) {
            if (isMultiTouchEvent(event.evt)) {
                this.handlePinchMove(event.evt);
                return;
            }

            isolateTouchEvent(event.evt);
        }

        if (!this.isDragging) return;

        const pointer = this.stage.getPointerPosition();
        if (!pointer) return;

        const threshold = window.innerWidth < MOBILE_BREAKPOINT ? 24 : CLICK_MOVE_THRESHOLD;
        if (
            Math.hypot(
                pointer.x - this.pointerStart.x,
                pointer.y - this.pointerStart.y
            ) > threshold
        ) {
            this.hasDraggedSincePointerStart = true;
        }

        const dx = (pointer.x - this.lastPointer.x) / this.scale;
        const dy = (pointer.y - this.lastPointer.y) / this.scale;

        this.offset.x += dx;
        this.offset.y += dy;

        this.velocity = { x: dx, y: dy };
        this.lastPointer = pointer;

        this.requestRender();
    };

    private handlePointerEnd = (
        event?: Konva.KonvaEventObject<MouseEvent | TouchEvent>
    ) => {
        const pointer = this.stage.getPointerPosition() ?? this.pointerStart;
        const shouldCenterClickedTile =
            this.isDragging &&
            event?.type === "mouseup" &&
            event?.evt instanceof MouseEvent &&
            event.evt.button === 0 &&
            !this.hasDraggedSincePointerStart;
        const clickedTile = shouldCenterClickedTile
            ? this.getTileAtPoint(pointer)
            : null;
        const shouldSelectTouchedTile =
            this.isDragging &&
            event &&
            isTouchEvent(event.evt) &&
            event.evt.touches.length < 2 &&
            !this.hasDraggedSincePointerStart;
        const touchedTile = shouldSelectTouchedTile
            ? this.getTileAtPoint(pointer)
            : null;

        if (event && isTouchEvent(event.evt)) {
            isolateTouchEvent(event.evt);

            if (event.evt.touches.length < 2) {
                this.handlePinchEnd();
            }
        }

        this.isDragging = false;
        this.container.style.cursor = CURSOR_GRAB;

        if (touchedTile) {
            if (this.activeTile === touchedTile && this.isTileCentered(touchedTile)) {
                this.openTileFromCurrentBounds(touchedTile);
            } else {
                this.centerTile(touchedTile);
                this.setActiveTileFromTile(touchedTile);
            }
            this.startAnimation();
            return;
        }

        if (clickedTile) {
            this.centerTile(clickedTile);
            return;
        }

        this.startAnimation();
    };

    private handleMouseMove = (event: MouseEvent) => {
        if (this.isDragging) return;

        if (this.activeTileClearTimer !== null) {
            clearTimeout(this.activeTileClearTimer);
            this.activeTileClearTimer = null;
        }

        const rect = this.container.getBoundingClientRect();
        const tile = this.getTileAtPoint({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        });

        if (tile === this.activeTile) return;

        this.setActiveTileFromTile(tile);
    };

    private handleMouseLeave = (event: MouseEvent) => {
        if (
            event.relatedTarget instanceof Node &&
            this.container.parentElement?.contains(event.relatedTarget)
        ) {
            return;
        }

        if (!this.isDragging && this.activeTileClearTimer === null) {
            this.activeTileClearTimer = setTimeout(() => {
                this.activeTileClearTimer = null;

                if (!this.isActiveTileControlHovered) {
                    this.setActiveTileFromTile(null);
                }
            }, 120);
        }
    };

    private endTrackpadPinchGesture = () => {
        this.trackpadPinchStartScale = this.targetScale;
        this.accumulatedTrackpadPinchDelta = 0;
        this.trackpadPinchTimeout = null;
    };

    private handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Control") {
            this.isControlKeyPressed = true;
        }
    };

    private handleKeyUp = (event: KeyboardEvent) => {
        if (event.key === "Control") {
            this.isControlKeyPressed = false;
        }
    };

    private handleWindowBlur = () => {
        this.isControlKeyPressed = false;
    };

    private handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
        const wheelEvent = event.evt;
        wheelEvent.preventDefault();
        this.pauseImageLoading();
        this.momentumTargetOffset = null;

        if (wheelEvent.ctrlKey) {
            this.velocity = { x: 0, y: 0 };
            const zoomSensitivity = this.isControlKeyPressed
                ? TRACKPAD_ZOOM_SENSITIVITY
                : TRACKPAD_PINCH_ZOOM_SENSITIVITY;

            if (this.trackpadPinchTimeout === null) {
                this.trackpadPinchStartScale = this.targetScale;
                this.accumulatedTrackpadPinchDelta = 0;
            }

            this.accumulatedTrackpadPinchDelta += wheelEvent.deltaY;

            this.targetScale = clamp(
                this.trackpadPinchStartScale *
                    Math.exp(
                        -this.accumulatedTrackpadPinchDelta *
                            zoomSensitivity
                    ),
                this.minScale,
                MAX_SCALE
            );
            this.zoomAnchorPoint = this.getPointerZoomPoint();

            if (this.trackpadPinchTimeout !== null) {
                clearTimeout(this.trackpadPinchTimeout);
            }

            this.trackpadPinchTimeout = setTimeout(
                this.endTrackpadPinchGesture,
                TRACKPAD_PINCH_END_DELAY
            );

            this.startAnimation();
            return;
        }

        const deltaX = normalizeWheelDelta(
            wheelEvent.deltaX,
            wheelEvent.deltaMode,
            this.stage.width()
        );

        const deltaY = normalizeWheelDelta(
            wheelEvent.deltaY,
            wheelEvent.deltaMode,
            this.stage.height()
        );

        const wheelX = wheelEvent.shiftKey
            ? deltaX || deltaY
            : deltaX;

        const wheelY = wheelEvent.shiftKey ? 0 : deltaY;

        this.velocity.x -= (wheelX / this.scale) * WHEEL_IMPULSE;
        this.velocity.y -= (wheelY / this.scale) * WHEEL_IMPULSE;

        this.startAnimation();
    };

    private handleContainerTouchStart = (event: TouchEvent) => {
        stopTouchPropagation(event);
    };

    private handleContainerTouchEnd = (event: TouchEvent) => {
        stopTouchPropagation(event);
    };

    private handleContextMenu = (event: MouseEvent) => {
        const rect = this.container.getBoundingClientRect();
        const tile = this.getTileAtPoint({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        });

        this.container.removeAttribute(CONTEXT_IMAGE_SRC_ATTRIBUTE);

        if (!tile) return;

        this.container.setAttribute(CONTEXT_IMAGE_SRC_ATTRIBUTE, tile.item.image);
    };

    /* ------------------------------------------------------------------ */
    /*                               Resize                               */
    /* ------------------------------------------------------------------ */

    private handleResize = () => {
        this.stage.size({
            width: window.innerWidth,
            height: window.innerHeight,
        });

        const nextItemWidth = getItemWidth();
        const nextMinScale = getMinScale(nextItemWidth);

        if (nextItemWidth !== this.itemWidth) {
            this.itemWidth = nextItemWidth;
            this.imageRequestWidth = getImageRequestWidth(this.itemWidth);
        }

        this.minScale = nextMinScale;
        this.scale = clamp(this.scale, this.minScale, MAX_SCALE);
        this.targetScale = clamp(this.targetScale, this.minScale, MAX_SCALE);

        this.buildTiles();
    };

    /* ------------------------------------------------------------------ */
    /*                              Lifecycle                             */
    /* ------------------------------------------------------------------ */

    public destroy() {
        this.isDestroyed = true;
        this.tileGeneration += 1;
        this.stopAnimation();

        if (this.renderFrameId !== null) {
            cancelAnimationFrame(this.renderFrameId);
        }

        if (this.sceneRevealFrameId !== null) {
            cancelAnimationFrame(this.sceneRevealFrameId);
        }

        if (this.sceneRevealSettleFrameId !== null) {
            cancelAnimationFrame(this.sceneRevealSettleFrameId);
        }

        if (this.trackpadPinchTimeout !== null) {
            clearTimeout(this.trackpadPinchTimeout);
        }

        if (this.imageLoadTimer !== null) {
            clearTimeout(this.imageLoadTimer);
        }

        if (this.imageLoadResumeTimer !== null) {
            clearTimeout(this.imageLoadResumeTimer);
        }

        if (this.openAfterCenterTimer !== null) {
            clearTimeout(this.openAfterCenterTimer);
        }

        if (this.activeTileClearTimer !== null) {
            clearTimeout(this.activeTileClearTimer);
            this.activeTileClearTimer = null;
        }

        this.removeEventListeners();
        this.stage.destroy();
        Konva.pixelRatio = this.previousPixelRatio;
    }
}
