"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { createPortal } from "react-dom";
import { getContainedRect, type Rect } from "./archiveUtils";

interface MediaElementProps {
  onLoad?: React.ReactEventHandler<HTMLElement>;
  onLoadedData?: React.ReactEventHandler<HTMLVideoElement>;
  onError?: React.ReactEventHandler<HTMLElement>;
  src?: string;
}

export default function MediaWrapper({
  children,
  aspectRatio = "16/9",
  preserveAspectRatio = false,
}: {
  children: ReactElement<MediaElementProps & { className?: string }>;
  aspectRatio?: string;
  preserveAspectRatio?: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const wrapperAspectRatio =
    preserveAspectRatio || !isLoaded ? aspectRatio : "auto";
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [openRect, setOpenRect] = useState<{
    origin: Rect;
    target: Rect;
  } | null>(null);
  const [expandedSrc, setExpandedSrc] = useState<string | null>(null);
  const [expandedMediaType, setExpandedMediaType] = useState<"img" | "video">(
    "img",
  );
  const portalRoot = typeof document === "undefined" ? null : document.body;

  const handleClick = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();

    let contentWidth = rect.width;
    let contentHeight = rect.height;
    let mediaSrc: string | null = null;
    let mediaType: "img" | "video" = "img";

    const childNode = ref.current.querySelector("img, video") as
      HTMLImageElement | HTMLVideoElement | null;
    if (childNode) {
      if (childNode instanceof HTMLImageElement) {
        contentWidth = childNode.naturalWidth || rect.width;
        contentHeight = childNode.naturalHeight || rect.height;
        mediaSrc = childNode.currentSrc || childNode.src;
        mediaType = "img";
      } else if (childNode instanceof HTMLVideoElement) {
        contentWidth = childNode.videoWidth || rect.width;
        contentHeight = childNode.videoHeight || rect.height;
        mediaSrc = childNode.currentSrc || childNode.src;
        mediaType = "video";
        childNode.pause();
      }
    } else {
      const arMatch = aspectRatio.match(/(\d+)\/(\d+)/);
      if (arMatch) {
        contentWidth = parseInt(arMatch[1], 10) * 100;
        contentHeight = parseInt(arMatch[2], 10) * 100;
      }
    }

    if (!mediaSrc) return;

    const target = getContainedRect(
      contentWidth,
      contentHeight,
      window.innerWidth,
      window.innerHeight,
    );

    setExpandedSrc(mediaSrc);
    setExpandedMediaType(mediaType);
    setOpenRect({
      origin: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      target,
    });
    setIsExpanded(true);
  };

  const handleClose = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setOpenRect((prev) =>
        prev
          ? {
              ...prev,
              origin: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              },
            }
          : prev,
      );
    }

    const videoEl = ref.current?.querySelector(
      "video",
    ) as HTMLVideoElement | null;
    if (videoEl) {
      videoEl.play();
    }

    setIsExpanded(false);
  }, []);

  useLayoutEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isExpanded, handleClose]);

  return (
    <>
      <div
        ref={ref}
        className={`relative overflow-hidden rounded-[12px] w-full bg-[var(--background-secondary)] transition-all duration-300 cursor-zoom-in ${isLoaded ? "" : "shimmer-loading"}`}
        style={{ aspectRatio: wrapperAspectRatio }}
        onLoadCapture={() => setIsLoaded(true)}
        onLoadedDataCapture={() => setIsLoaded(true)}
        onErrorCapture={() => setIsLoaded(true)}
        onClick={handleClick}
      >
        <motion.div
          style={{ scale, transformOrigin: "center" }}
          className={`w-full transition-opacity duration-500 ${isLoaded ? "opacity-100 h-auto" : "opacity-0 h-full"} ${isExpanded ? "invisible" : ""}`}
        >
          {children}
        </motion.div>
      </div>

      {portalRoot &&
        createPortal(
          <AnimatePresence>
            {isExpanded && openRect && expandedSrc && (
              <motion.div className="fixed inset-0 z-[110] pointer-events-none">
                <motion.div
                  className="absolute inset-0 bg-black/72 pointer-events-auto cursor-zoom-out"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                  onClick={handleClose}
                />

                <motion.div
                  className="fixed overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.4)] outline outline-1 outline-white/10 pointer-events-auto"
                  style={{
                    left: openRect.target.x,
                    top: openRect.target.y,
                    width: openRect.target.width,
                    height: openRect.target.height,
                    transformOrigin: "top left",
                    willChange: "transform",
                  }}
                  initial={{
                    x: openRect.origin.x - openRect.target.x,
                    y: openRect.origin.y - openRect.target.y,
                    scale: openRect.origin.width / openRect.target.width,
                    opacity: 1,
                    borderRadius: "12px",
                  }}
                  animate={{
                    x: 0,
                    y: 0,
                    scale: 1,
                    opacity: 1,
                    borderRadius: "8px",
                  }}
                  exit={{
                    x: openRect.origin.x - openRect.target.x,
                    y: openRect.origin.y - openRect.target.y,
                    scale: openRect.origin.width / openRect.target.width,
                    opacity: 1,
                    borderRadius: "12px",
                  }}
                  transition={{ type: "spring", duration: 0.45, bounce: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {expandedMediaType === "video" ? (
                    /* eslint-disable-next-line jsx-a11y/media-has-caption */
                    <video
                      src={expandedSrc}
                      className="h-full w-full object-contain"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={expandedSrc}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  )}
                </motion.div>

                <motion.button
                  type="button"
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-md transition-[background-color,transform] duration-150 hover:bg-white/16 active:scale-[0.96] md:right-6 md:top-6 pointer-events-auto"
                  aria-label="Close image"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleClose();
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 32 32"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 8L24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M8 24L24 8"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>,
          portalRoot,
        )}
    </>
  );
}
