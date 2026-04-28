"use client";

import { springBase } from "@/lib/transitions";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type CardProps = {
    image: string;
    title?: string;
    description?: string;
    link?: string;
    tags?: string[];
    variant?: "default" | "list" | "list-stacked";
    aspectRatio?: string;
    shimmerAspectRatio?: string;
    locked?: boolean;
};

type LoadingStatus = "loading" | "ready" | "error";

const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov|avi|ogv)(\?.*)?$/i.test(url);
const DEFAULT_SHIMMER_ASPECT_RATIO = "3 / 2";

function normalizeAspectRatio(aspectRatio?: string) {
    if (!aspectRatio || aspectRatio === "auto") {
        return aspectRatio;
    }

    if (aspectRatio === "aspect-video") {
        return "16 / 9";
    }

    if (aspectRatio.startsWith("aspect-[")) {
        return aspectRatio.slice(8, -1).replace(":", " / ");
    }

    if (aspectRatio.includes(":")) {
        return aspectRatio.replace(":", " / ");
    }

    return aspectRatio;
}

const LockIcon = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const LockedBadge = () => (
    <div className="absolute top-4 right-4 z-10">
        <span className="inline-flex items-center gap-1.5 px-4 py-2 border border-[var(--border-primary)] rounded-full label-s bg-[var(--background-inverse)] text-[var(--content-primary-inverse)]">
            <LockIcon />
            Locked
        </span>
    </div>
);

interface CardMediaProps {
    image: string;
    title?: string;
    aspectRatio: string;
    shimmerAspectRatio?: string;
    locked?: boolean;
}

function CardMedia({
    image,
    title,
    aspectRatio,
    shimmerAspectRatio,
    locked,
}: CardMediaProps) {
    const [status, setStatus] = useState<LoadingStatus>("loading");
    const isMounted = useRef(true);
    const isVideo = isVideoUrl(image);
    const isAuto = aspectRatio === "auto";
    const normalizedAspectRatio = normalizeAspectRatio(aspectRatio);
    const normalizedShimmerAspectRatio = normalizeAspectRatio(shimmerAspectRatio);
    const containerAspectRatio =
        status === "loading"
            ? normalizedShimmerAspectRatio || (isAuto ? DEFAULT_SHIMMER_ASPECT_RATIO : normalizedAspectRatio)
            : normalizedAspectRatio;

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const handleLoad = () => {
        if (isMounted.current) {
            setStatus("ready");
        }
    };

    const handleError = () => {
        if (isMounted.current) {
            setStatus("error");
        }
    };

    const mediaClasses = cn(
        locked && "grayscale",
        status === "ready" ? "opacity-100 scale-100" : "opacity-0 scale-105",
        status === "error" && "hidden",
        isAuto && status === "ready"
            ? "relative w-full h-auto"
            : "absolute inset-0 w-full h-full object-cover",
        "transition-all duration-700 ease-out"
    );

    return (
        <div
            className="relative overflow-hidden rounded-xl bg-[var(--background-secondary)] w-full transition-all duration-500"
            style={containerAspectRatio === "auto" ? undefined : { aspectRatio: containerAspectRatio }}
        >
            {locked && <LockedBadge />}

            <AnimatePresence>
                {status === "loading" && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-10 shimmer-loading"
                    />
                )}
            </AnimatePresence>

            {status === "error" && (
                <div
                    className={cn(
                        "flex items-center justify-center bg-[var(--background-secondary)] text-[var(--content-tertiary)] p-4 text-center",
                        isAuto ? "aspect-square w-full" : "absolute inset-0"
                    )}
                >
                    <span className="label-s opacity-60">Failed to load media</span>
                </div>
            )}

            {isVideo ? (
                <video
                    src={image}
                    className={mediaClasses}
                    autoPlay
                    muted
                    loop
                    playsInline
                    onLoadedData={handleLoad}
                    onError={handleError}
                />
            ) : (
                <img
                    src={image}
                    alt={title ? `Image representing ${title}` : "Project or artwork showcase"}
                    className={mediaClasses}
                    loading="lazy"
                    onLoad={handleLoad}
                    onError={handleError}
                />
            )}
        </div>
    );
}

function CardTags({ tags }: { tags: string[] }) {
    return (
        <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
                <div
                    key={tag}
                    className="px-4 py-2 rounded-full label-s bg-[var(--background-secondary)] text-[var(--content-secondary)]"
                >
                    {tag}
                </div>
            ))}
        </div>
    );
}

export default function Card({
    image,
    title,
    description,
    link,
    tags,
    variant = "default",
    aspectRatio = "aspect-video",
    shimmerAspectRatio,
    locked = false,
}: CardProps) {
    const isList = variant === "list";
    const isStacked = variant === "list-stacked";
    const isAnyList = isList || isStacked;
    const isExternal = link?.startsWith("http");
    const hoverScale = isList ? 1.01 : 1.03;
    const tapScale = isList ? 0.99 : 0.97;
    const textOpacityStyle = locked ? { opacity: 0.4 } : undefined;

    const content = isAnyList ? (
        <div
            className={cn(
                "w-full gap-3 flex flex-col items-center group",
                isStacked ? "bg-[var(--background-primary)] rounded-t-xl" : "md:flex-row"
            )}
        >
            <div className={cn("relative w-full", !isStacked && "md:max-w-[240px]")}>
                <CardMedia
                    image={image}
                    title={title}
                    aspectRatio={aspectRatio}
                    shimmerAspectRatio={shimmerAspectRatio}
                    locked={locked}
                />
            </div>

            <div className="w-full flex flex-col gap-1" style={textOpacityStyle}>
                {title && <h5 className="text-[var(--content-primary)]">{title}</h5>}
                {description && <div className="label-m text-[var(--content-secondary)]">{description}</div>}
            </div>

            {tags && tags.length > 0 && (
                <div
                    className={cn("w-full flex justify-start gap-2", !isStacked && "lg:max-w-[320px] md:justify-end")}
                    style={textOpacityStyle}
                >
                    <CardTags tags={tags} />
                </div>
            )}
        </div>
    ) : (
        <div className="flex flex-col gap-2">
            <div className="w-full p-2 rounded-[var(--radius-lg)] bg-[var(--background-secondary)]">
                <CardMedia
                    image={image}
                    title={title}
                    aspectRatio={aspectRatio}
                    shimmerAspectRatio={shimmerAspectRatio}
                    locked={locked}
                />
            </div>

            {(title || description) && (
                <div
                    className="w-full flex flex-col p-4 gap-1 rounded-[var(--radius-lg)] bg-[var(--background-secondary)]"
                    style={textOpacityStyle}
                >
                    {title && <div className="w-full text-[var(--content-primary)] label-m">{title}</div>}
                    {description && <div className="w-full text-[var(--content-tertiary)] body-s-medium">{description}</div>}
                </div>
            )}
        </div>
    );

    if (locked || !link) {
        return <div className="w-full">{content}</div>;
    }

    if (isExternal) {
        return (
            <motion.a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: hoverScale }}
                whileTap={{ scale: tapScale }}
                transition={springBase}
                className="w-full block cursor-pointer"
            >
                {content}
            </motion.a>
        );
    }

    return (
        <motion.div
            whileHover={{ scale: hoverScale }}
            whileTap={{ scale: tapScale }}
            transition={springBase}
            className="w-full block cursor-pointer"
        >
            <Link href={link}>{content}</Link>
        </motion.div>
    );
}
