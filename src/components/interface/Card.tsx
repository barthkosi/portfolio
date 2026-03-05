"use client";

import { springBase } from "@/lib/transitions"
import { motion } from "motion/react"
import Link from "next/link"

type CardProps = {
    image: string
    title?: string
    description?: string
    link?: string
    tags?: string[]
    variant?: 'default' | 'list' | 'list-stacked'
    aspectRatio?: string
    locked?: boolean
}

// Helper to detect if a URL is a video
const isVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.ogv'];
    const lowercaseUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowercaseUrl.includes(ext));
};

// Lock icon SVG component
const LockIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

// Locked overlay badge
const LockedBadge = () => (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full label-s bg-[var(--background-inverse)] text-[var(--content-primary-inverse)]">
            <LockIcon />
            Locked
        </span>
    </div>
);

export default function Card({
    image,
    title,
    description,
    link,
    tags,
    variant = "default",
    aspectRatio = "aspect-video",
    locked = false
}: CardProps) {
    const isVideo = isVideoUrl(image);
    const grayscaleClass = locked ? "grayscale" : "";
    const textOpacityStyle = locked ? { opacity: 0.4 } : undefined;

    // Default Card Content
    const DefaultContent = (
        <>
            <div className="flex flex-col gap-2">
                <div className="w-full p-2 rounded-[var(--radius-lg)] bg-[var(--background-secondary)]">
                    <div className={`relative w-full ${aspectRatio === "auto" ? "" : aspectRatio} overflow-hidden rounded-xl`}>
                        {locked && <LockedBadge />}
                        {isVideo ? (
                            <video
                                src={image}
                                className={`${aspectRatio === "auto" ? "w-full h-auto" : "absolute inset-0 w-full h-full"} object-cover ${grayscaleClass}`}
                                autoPlay
                                muted
                                loop
                                playsInline
                            />
                        ) : (
                            <img
                                src={image}
                                alt={title || ""}
                                className={`${aspectRatio === "auto" ? "w-full h-auto" : "absolute inset-0 w-full h-full"} object-cover ${grayscaleClass}`}
                                loading="lazy"
                            />
                        )}
                    </div>
                </div>

                {(title || description) && (
                    <div className="w-full flex flex-col p-4 gap-1 rounded-[var(--radius-lg)] bg-[var(--background-secondary)]" style={textOpacityStyle}>
                        {title && <div className="w-full text-[var(--content-primary)] label-m">{title}</div>}
                        {description && <div className="w-full text-[var(--content-tertiary)] body-s-medium">{description}</div>}
                    </div>
                )}
            </div>
        </>
    );

    // List Card Content
    const isStacked = variant === 'list-stacked';
    const imageClasses = `${aspectRatio === "auto" ? "w-full h-auto" : `${aspectRatio} w-full`} ${isStacked ? '' : 'md:max-w-[240px]'} rounded-xl object-cover bg-[var(--background-secondary)] ${grayscaleClass}`;
    const ListContent = (
        <div className={`w-full gap-3 flex flex-col ${isStacked ? 'bg-[var(--background-primary)] rounded-t-xl' : 'md:flex-row'} items-center group`}>
            {isVideo ? (
                <video
                    src={image}
                    className={imageClasses}
                    autoPlay
                    muted
                    loop
                    playsInline
                />
            ) : locked ? (
                <div className={`relative ${isStacked ? 'w-full' : `w-full ${aspectRatio === "auto" ? "" : ""}`} ${isStacked ? '' : 'md:max-w-[240px]'}`}>
                    <LockedBadge />
                    <img
                        src={image}
                        alt={title || ""}
                        className={`${aspectRatio === "auto" ? "w-full h-auto" : `${aspectRatio} w-full`} rounded-xl object-cover bg-[var(--background-secondary)] ${grayscaleClass}`}
                    />
                </div>
            ) : (
                <img
                    src={image}
                    alt={title || ""}
                    className={imageClasses}
                />
            )}
            <div className="w-full flex flex-col gap-1" style={textOpacityStyle}>
                {title && <h5 className="text-[var(--content-primary)]">{title}</h5>}
                {description && <div className="label-m text-[var(--content-secondary)]">{description}</div>}
            </div>
            {tags && tags.length > 0 && (
                <div className={`w-full ${isStacked ? '' : 'lg:max-w-[320px]'} flex flex-wrap justify-start ${isStacked ? '' : 'md:justify-end'} gap-2`} style={textOpacityStyle}>
                    {tags.map((tag) => (
                        <div key={tag} className="px-4 py-2 rounded-full label-s bg-[var(--background-secondary)] text-[var(--content-secondary)]">
                            {tag}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // Determines which content to render
    const content = (variant === "list" || variant === "list-stacked") ? ListContent : DefaultContent;

    // When locked, disable all interactivity — no link, no hover scale
    if (locked) {
        return (
            <div className="w-full">
                {content}
            </div>
        )
    }

    if (link) {
        // Check if link is external (starts with http)
        const isExternal = link.startsWith('http');

        if (isExternal) {
            return (
                <motion.a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block"
                    whileHover={{ scale: variant === "list" ? 1.01 : 1.03 }}
                    transition={springBase}
                >
                    {content}
                </motion.a>
            )
        } else {
            return (
                <motion.div
                    className="w-full"
                    whileHover={{ scale: variant === "list" ? 1.01 : 1.03 }}
                    transition={springBase}
                >
                    <Link href={link}>
                        {content}
                    </Link>
                </motion.div>
            )
        }
    }

    return (
        <div className="w-full">
            {content}
        </div>
    )
}
