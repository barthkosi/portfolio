"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import Button from "@/components/interface/Button";
import {
    ActiveArchiveTile,
    OpenArchiveImage,
    getContainedRect,
} from "./archiveUtils";
import { ArchiveGridController } from "./ArchiveGridController";

export default function ArchiveContent() {
    const containerRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<ArchiveGridController | null>(null);
    const [sceneReady, setSceneReady] = useState(false);
    const [activeTile, setActiveTile] = useState<ActiveArchiveTile | null>(null);
    const [openImage, setOpenImage] = useState<OpenArchiveImage | null>(null);
    const [isOpenImageLoaded, setIsOpenImageLoaded] = useState(false);
    const portalRoot =
        typeof document === "undefined" ? null : document.body;

    useEffect(() => {
        if (!openImage) return;

        const image = new Image();
        image.onload = () => setIsOpenImageLoaded(true);
        image.src = openImage.image;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpenImage(null);
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [openImage]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const controller = new ArchiveGridController({
            container,
            onSceneReady: setSceneReady,
            onActiveTileChange: setActiveTile,
            onOpenTile: setOpenImage,
            setIsOpenImageLoaded,
        });

        controllerRef.current = controller;

        return () => {
            controller.destroy();
            controllerRef.current = null;
        };
    }, []);

    const openImageTarget =
        openImage && typeof window !== "undefined"
            ? getContainedRect(
                  openImage.naturalWidth,
                  openImage.naturalHeight,
                  window.innerWidth,
                  window.innerHeight
              )
            : null;

    return (
        <div
            className="relative w-full h-full"
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

            {portalRoot &&
                createPortal(
                    <>
                        <AnimatePresence>
                            {activeTile && !openImage && (
                                <motion.div
                                    className="fixed z-[100] pointer-events-auto"
                                    style={{
                                        left: activeTile.x + activeTile.width / 2,
                                        top: activeTile.y + activeTile.height - 8,
                                        translate: "-50% -100%",
                                    }}
                                    onMouseEnter={() => {
                                        controllerRef.current?.setActiveTileControlHovered(true);
                                    }}
                                    onMouseLeave={() => {
                                        controllerRef.current?.setActiveTileControlHovered(false);
                                    }}
                                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                                    transition={{
                                        type: "spring",
                                        duration: 0.3,
                                        bounce: 0,
                                    }}
                                >
                                    <Button
                                        size="sm"
                                        onClick={() => controllerRef.current?.openActiveTile()}
                                        className="min-h-10 px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                                    >
                                        Open
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {openImage && openImageTarget && (
                                <motion.div
                                    className="fixed inset-0 z-[110] bg-black/72"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{
                                        duration: 0.2,
                                        ease: [0.23, 1, 0.32, 1],
                                    }}
                                    onClick={() => setOpenImage(null)}
                                >
                                    <motion.div
                                        className="fixed overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.4)] outline outline-1 outline-white/10"
                                        style={{
                                            left: openImageTarget.x,
                                            top: openImageTarget.y,
                                            width: openImageTarget.width,
                                            height: openImageTarget.height,
                                            transformOrigin: "top left",
                                        }}
                                        initial={{
                                            x: openImage.origin.x - openImageTarget.x,
                                            y: openImage.origin.y - openImageTarget.y,
                                            scale:
                                                openImage.origin.width /
                                                openImageTarget.width,
                                            opacity: 1,
                                        }}
                                        animate={{
                                            x: 0,
                                            y: 0,
                                            scale: 1,
                                            opacity: 1,
                                        }}
                                        exit={{
                                            x: openImage.origin.x - openImageTarget.x,
                                            y: openImage.origin.y - openImageTarget.y,
                                            scale:
                                                openImage.origin.width /
                                                openImageTarget.width,
                                            opacity: 0,
                                        }}
                                        transition={{
                                            type: "spring",
                                            duration: 0.45,
                                            bounce: 0,
                                        }}
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={
                                                isOpenImageLoaded
                                                    ? openImage.image
                                                    : openImage.previewImage
                                            }
                                            alt=""
                                            className="h-full w-full object-contain"
                                        />
                                    </motion.div>

                                    <button
                                        type="button"
                                        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-md transition-[background-color,transform] duration-150 hover:bg-white/16 active:scale-[0.96] md:right-6 md:top-6"
                                        aria-label="Close image"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setOpenImage(null);
                                        }}
                                    >
                                        <svg
                                            width="32"
                                            height="32"
                                            viewBox="0 0 32 32"
                                            fill="none"
                                            aria-hidden="true"
                                        >
                                            <path
                                                d="M8 8L25 25"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                fill="none"
                                            />
                                            <path
                                                d="M8 25L25 8"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                fill="none"
                                            />
                                        </svg>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>,
                    portalRoot
                )}
        </div>
    );
}
