"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import Image, { type ImageLoaderProps } from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import ReactMarkdown, { type Components } from "react-markdown";
import Button from "@/components/interface/Button";
import Card from "@/components/interface/Card";
import postMediaData from "@/data/post-media.json";
import type { ContentItem, ContentType } from "@/lib/content";
import {
    getCloudinaryOptimizedVideoSrc,
    getCloudinaryResponsiveImageSrc,
    isCloudinaryImageUrl,
    isCloudinaryVideoUrl,
} from "@/lib/image-urls";


interface PostContentProps {
    post: ContentItem;
    otherPosts: ContentItem[];
    type: ContentType;
    prevPost?: { slug: string; title: string } | null;
    nextPost?: { slug: string; title: string } | null;
}

interface HeadingItem {
    id: string;
    text: string;
    level: 1 | 2 | 3;
}

interface TocDot {
    id: string;
    x: number;
    y: number;
}

interface ScrollData {
    headingsTop: { id: string; top: number }[];
    itemY: Record<string, number>;
}

interface MarkdownNodeLike {
    type?: string;
    tagName?: string;
    children?: MarkdownNodeLike[];
}

interface MediaElementProps {
    onLoad?: React.ReactEventHandler<HTMLElement>;
    onLoadedData?: React.ReactEventHandler<HTMLVideoElement>;
    onError?: React.ReactEventHandler<HTMLElement>;
    src?: string;
}

interface PostMediaMeta {
    width: number;
    height: number;
    aspectRatio: string;
}

const DEFAULT_MARKDOWN_IMAGE_SIZES = "(min-width: 1024px) 640px, calc(100vw - 32px)";
const FULL_MARKDOWN_IMAGE_SIZES = "(min-width: 768px) calc(100vw - 64px), calc(100vw - 32px)";
const DEFAULT_ROW_MARKDOWN_IMAGE_SIZES = "(min-width: 1024px) 348px, (min-width: 768px) calc(50vw - 40px), calc(100vw - 32px)";
const FULL_ROW_MARKDOWN_IMAGE_SIZES = "(min-width: 768px) calc(50vw - 44px), calc(100vw - 32px)";

const cloudinaryImageLoader = ({ src, width }: ImageLoaderProps) =>
    getCloudinaryResponsiveImageSrc(src, width);

const getImageLoader = (src: string) =>
    isCloudinaryImageUrl(src) ? cloudinaryImageLoader : undefined;

const postMedia = postMediaData as Record<string, PostMediaMeta | undefined>;

function getPostMediaMeta(src: string) {
    return postMedia[src];
}

function MarkdownImage({
    src,
    alt,
    sizes = DEFAULT_MARKDOWN_IMAGE_SIZES,
    mediaMeta,
}: {
    src: string;
    alt: string;
    sizes?: string;
    mediaMeta?: PostMediaMeta;
}) {
    const [dimensions, setDimensions] = useState({
        width: mediaMeta?.width ?? 1200,
        height: mediaMeta?.height ?? 800,
    });
    const loader = getImageLoader(src);

    return (
        <Image
            loader={loader}
            src={src}
            alt={alt}
            width={dimensions.width}
            height={dimensions.height}
            sizes={sizes}
            className="w-full h-auto block mx-auto"
            data-original-src={src}
            onLoad={(event) => {
                const image = event.currentTarget;

                if (image.naturalWidth && image.naturalHeight) {
                    setDimensions({
                        width: image.naturalWidth,
                        height: image.naturalHeight,
                    });
                }
            }}
        />
    );
}

const processContent = (content: string) =>
    content.replace(/^:::[ ]*\r?\n([\s\S]*?)^:::[ ]*$/gm, (_, block: string) => {
        return `\`\`\`row\n${block.trim()}\n\`\`\``;
    });

const slugify = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/[\s_]+/g, "-");

function extractText(node: ReactNode): string {
    if (typeof node === "string" || typeof node === "number") {
        return String(node);
    }

    if (Array.isArray(node)) {
        return node.map(extractText).join("");
    }

    if (node && typeof node === "object" && "props" in node) {
        return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
    }

    return "";
}

function extractHeadings(content: string): HeadingItem[] {
    const safeContent = content.replace(/```[\s\S]*?```/g, "");

    return safeContent.split("\n").reduce<HeadingItem[]>((headings, line) => {
        const h3 = line.match(/^###\s+(.+)/);
        const h2 = line.match(/^##\s+(.+)/);
        const h1 = line.match(/^#\s+(.+)/);

        if (h3) {
            headings.push({ id: slugify(h3[1].trim()), text: h3[1].trim(), level: 3 });
        } else if (h2) {
            headings.push({ id: slugify(h2[1].trim()), text: h2[1].trim(), level: 2 });
        } else if (h1) {
            headings.push({ id: slugify(h1[1].trim()), text: h1[1].trim(), level: 1 });
        }

        return headings;
    }, []);
}

function isMediaParagraph(node: MarkdownNodeLike | undefined) {
    const childNodes = node?.children ?? [];
    return childNodes.length > 0 && childNodes.every((child) => child.type === "element" && child.tagName === "img");
}

function MediaWrapper({
    children,
    aspectRatio = "16/9",
    preserveAspectRatio = false,
}: {
    children: ReactElement<MediaElementProps>;
    aspectRatio?: string;
    preserveAspectRatio?: boolean;
}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const wrapperAspectRatio = preserveAspectRatio || !isLoaded ? aspectRatio : "auto";

    return (
        <div
            className={`relative overflow-hidden rounded-[12px] w-full bg-[var(--background-secondary)] transition-all duration-300 ${isLoaded ? "" : "shimmer-loading"}`}
            style={{ aspectRatio: wrapperAspectRatio }}
            onLoadCapture={() => setIsLoaded(true)}
            onLoadedDataCapture={() => setIsLoaded(true)}
            onErrorCapture={() => setIsLoaded(true)}
        >
            <div className={`w-full transition-opacity duration-500 ${isLoaded ? "opacity-100 h-auto" : "opacity-0 h-full"}`}>
                {children}
            </div>
        </div>
    );
}

function TableOfContents({ headings }: { headings: HeadingItem[] }) {
    const [activeId, setActiveId] = useState("");
    const containerRef = useRef<HTMLElement>(null);
    const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
    const clipRectRef = useRef<SVGRectElement>(null);
    const scrollDataRef = useRef<ScrollData>({ headingsTop: [], itemY: {} });
    const [pathData, setPathData] = useState("");
    const [pathHeight, setPathHeight] = useState(0);
    const [dotPositions, setDotPositions] = useState<TocDot[]>([]);

    useEffect(() => {
        if (!containerRef.current || headings.length === 0) {
            return;
        }

        const updatePathAndCache = () => {
            if (!containerRef.current || headings.length === 0) {
                return;
            }

            const containerTop = containerRef.current.getBoundingClientRect().top;
            const scrollY = window.scrollY;
            const offset = 120;
            const headingsTop: { id: string; top: number }[] = [];
            const itemY: Record<string, number> = {};
            const dots: TocDot[] = [];
            let path = "";
            let lastPoint: { x: number; y: number } | null = null;
            let maxY = 0;

            headings.forEach((heading, index) => {
                const element = itemRefs.current[heading.id];

                if (!element) {
                    return;
                }

                const rect = element.getBoundingClientRect();
                const y = Math.max(0, rect.top - containerTop + rect.height / 2);
                const x = heading.level === 1 ? 2 : heading.level === 2 ? 10 : 18;

                maxY = Math.max(maxY, y);
                itemY[heading.id] = y;
                dots.push({ id: heading.id, x, y });

                if (index === 0) {
                    path += `M ${x} ${y}`;
                } else if (lastPoint) {
                    const radius = 8;

                    if (lastPoint.x === x) {
                        path += ` L ${x} ${y}`;
                    } else {
                        path += ` L ${lastPoint.x} ${y - radius}`;
                        path += ` A ${radius} ${radius} 0 0 ${x > lastPoint.x ? 0 : 1} ${x} ${y}`;
                    }
                }

                lastPoint = { x, y };

                const documentHeading = document.getElementById(heading.id);
                headingsTop.push({
                    id: heading.id,
                    top: documentHeading
                        ? documentHeading.getBoundingClientRect().top + scrollY - offset
                        : 0,
                });
            });

            setPathData(path);
            setPathHeight(maxY + 10);
            setDotPositions(dots);
            scrollDataRef.current = { headingsTop, itemY };
        };

        const timeoutId = window.setTimeout(updatePathAndCache, 100);
        window.addEventListener("resize", updatePathAndCache);

        const observer =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => updatePathAndCache())
                : null;

        observer?.observe(document.body);

        return () => {
            window.clearTimeout(timeoutId);
            window.removeEventListener("resize", updatePathAndCache);
            observer?.disconnect();
        };
    }, [headings]);

    useEffect(() => {
        if (headings.length === 0) {
            return;
        }

        let ticking = false;

        const updateScroll = () => {
            const scrollY = window.scrollY;
            const { headingsTop, itemY } = scrollDataRef.current;

            if (headingsTop.length === 0) {
                return;
            }

            let targetY = 0;
            let currentActiveId = headingsTop[0].id;
            const isAtBottom = window.innerHeight + scrollY >= document.documentElement.scrollHeight - 100;

            if (scrollY < headingsTop[0].top && !isAtBottom) {
                currentActiveId = "";
            } else if (isAtBottom || scrollY >= headingsTop[headingsTop.length - 1].top) {
                currentActiveId = headingsTop[headingsTop.length - 1].id;
                targetY = itemY[currentActiveId] || 0;
            } else {
                for (let index = 0; index < headingsTop.length - 1; index += 1) {
                    const current = headingsTop[index];
                    const next = headingsTop[index + 1];

                    if (scrollY >= current.top && scrollY < next.top) {
                        currentActiveId = current.id;
                        const distance = next.top - current.top;
                        const progress = distance > 0 ? (scrollY - current.top) / distance : 0;
                        const startY = itemY[current.id] || 0;
                        const endY = itemY[next.id] || 0;
                        targetY = startY + progress * (endY - startY);
                        break;
                    }
                }
            }

            clipRectRef.current?.setAttribute("height", String(Math.max(0, targetY + 10)));
            setActiveId(currentActiveId);
        };

        const handleScroll = () => {
            if (ticking) {
                return;
            }

            ticking = true;
            window.requestAnimationFrame(() => {
                updateScroll();
                ticking = false;
            });
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        const timeoutId = window.setTimeout(updateScroll, 150);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.clearTimeout(timeoutId);
        };
    }, [headings]);

    if (headings.length === 0) {
        return null;
    }

    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        event.preventDefault();
        const element = document.getElementById(id);

        if (!element) {
            return;
        }

        const top = element.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top, behavior: "smooth" });
        setActiveId(id);
    };

    return (
        <nav ref={containerRef as React.RefObject<HTMLElement>} className="relative flex flex-col gap-1 w-[200px] pl-6">
            <span className="label-s text-[var(--content-tertiary)] mb-2 opacity-60 uppercase tracking-wider relative -left-6">
                On this page
            </span>

            {pathData && (
                <svg
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{ width: 24, height: pathHeight + 10, overflow: "visible" }}
                >
                    <path
                        d={pathData}
                        fill="none"
                        className="stroke-[var(--border-primary)]"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {dotPositions.map(({ id, x, y }) => (
                        <circle
                            key={`dot-bg-${id}`}
                            cx={x}
                            cy={y}
                            r="3"
                            className="fill-[var(--background-primary)] stroke-[var(--border-primary)] stroke-2"
                        />
                    ))}

                    <clipPath id="active-line-clip">
                        <rect ref={clipRectRef} x="-10" y="-10" width="40" height="0" />
                    </clipPath>

                    <g clipPath="url(#active-line-clip)">
                        <path
                            d={pathData}
                            fill="none"
                            className="stroke-[var(--content-primary)]"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        {dotPositions.map(({ id, x, y }) => (
                            <circle
                                key={`dot-active-${id}`}
                                cx={x}
                                cy={y}
                                r="3"
                                className="fill-[var(--content-primary)]"
                            />
                        ))}
                    </g>
                </svg>
            )}

            {headings.map(({ id, text, level }) => {
                const isActive = activeId === id;

                return (
                    <a
                        key={id}
                        ref={(element) => {
                            itemRefs.current[id] = element;
                        }}
                        href={`#${id}`}
                        onClick={(event) => handleClick(event, id)}
                        className={`group flex items-start py-1 transition-all duration-200 relative ${level === 2 ? "pl-2" : level === 3 ? "pl-4" : ""}`}
                    >
                        <span
                            className={`label-s leading-snug transition-colors duration-200 ${
                                isActive
                                    ? "text-[var(--content-primary)] font-medium"
                                    : "text-[var(--content-tertiary)] group-hover:text-[var(--content-secondary)]"
                            }`}
                        >
                            {text}
                        </span>
                    </a>
                );
            })}
        </nav>
    );
}

function PostNavigationLink({
    direction,
    href,
}: {
    direction: "previous" | "next";
    href: string;
}) {
    return (
        <Link
            href={href}
            className="flex flex-row label-m text-[var(--content-primary)] hover:text-[var(--content-secondary)] transition-colors"
        >
            {direction === "previous" && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M11.7803 14.7803C12.0732 14.4874 12.0732 14.0126 11.7803 13.7197L8.06066 10L11.7803 6.28033C12.0732 5.98744 12.0732 5.51256 11.7803 5.21967C11.4874 4.92678 11.0126 4.92678 10.7197 5.21967L6.46967 9.46967C6.32902 9.61032 6.25 9.80109 6.25 10C6.25 10.1989 6.32902 10.3897 6.46967 10.5303L10.7197 14.7803C11.0126 15.0732 11.4874 15.0732 11.7803 14.7803Z" fill="currentColor" />
                </svg>
            )}
            {direction === "previous" ? "Previous" : "Next"}
            {direction === "next" && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M8.21967 14.7803C7.92678 14.4874 7.92678 14.0126 8.21967 13.7197L11.9393 10L8.21967 6.28033C7.92678 5.98744 7.92678 5.51256 8.21967 5.21967C8.51256 4.92678 8.98744 4.92678 9.28033 5.21967L13.5303 9.46967C13.671 9.61032 13.75 9.80109 13.75 10C13.75 10.1989 13.671 10.3897 13.5303 10.5303L9.28033 14.7803C8.98744 15.0732 8.51256 15.0732 8.21967 14.7803Z" fill="currentColor" />
                </svg>
            )}
        </Link>
    );
}

function formatDateWithOrdinal(dateString: string) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "long" });
    const year = date.getFullYear();
    
    const getOrdinalSuffix = (n: number) => {
        if (n > 3 && n < 21) return "th";
        switch (n % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    };

    return `${day}${getOrdinalSuffix(day)} ${month}, ${year}`;
}

export default function PostContent({
    post,
    otherPosts,
    type,
    prevPost,
    nextPost,
}: PostContentProps) {
    const isDefaultLayout = post.layout !== "full";
    const markdownImageSizes = isDefaultLayout ? DEFAULT_MARKDOWN_IMAGE_SIZES : FULL_MARKDOWN_IMAGE_SIZES;
    const rowMarkdownImageSizes = isDefaultLayout ? DEFAULT_ROW_MARKDOWN_IMAGE_SIZES : FULL_ROW_MARKDOWN_IMAGE_SIZES;
    const headings = useMemo(
        () => (isDefaultLayout ? extractHeadings(post.content || "") : []),
        [isDefaultLayout, post.content]
    );
    const filteredOtherPosts = useMemo(
        () => otherPosts.filter((otherPost) => !otherPost.locked),
        [otherPosts]
    );

    const markdownComponents: Components = {
        p: ({ node, children, ...props }) => {
            if (isMediaParagraph(node as MarkdownNodeLike | undefined)) {
                return <>{children}</>;
            }

            return (
                <p className="blog-text mb-4 lg:mb-6 text-[var(--content-primary)]" {...props}>
                    {children}
                </p>
            );
        },
        a: (props) => (
            <a
                className="blog-text mb-4 lg:mb-6 text-[var(--content-link)] hover:text-[var(--content-link-hover)] transition-colors"
                {...props}
            />
        ),
        img: ({ src = "", alt = "" }) => {
            const source = String(src);
            const mediaMeta = getPostMediaMeta(source);
            const aspectRatio = mediaMeta?.aspectRatio;
            const videoSource = isCloudinaryVideoUrl(source)
                ? getCloudinaryOptimizedVideoSrc(source)
                : source;

            if (/\.(mp4|webm|mov)(\?.*)?$/i.test(source)) {
                return (
                    <figure className="mb-4 lg:mb-6">
                        <MediaWrapper aspectRatio={aspectRatio ?? "16/9"} preserveAspectRatio={Boolean(aspectRatio)}>
                            <video
                                src={videoSource}
                                className="w-full h-auto block"
                                data-original-src={source}
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                        </MediaWrapper>
                        {alt ? <figcaption className="label-s text-[var(--content-tertiary)] mt-2 text-center">{alt}</figcaption> : null}
                    </figure>
                );
            }

            if (source.includes("player.cloudinary.com/embed")) {
                return (
                    <figure className="mb-4 lg:mb-6">
                        <MediaWrapper aspectRatio="16/9">
                            <iframe
                                src={source}
                                title={alt || "Embedded media"}
                                className="w-full aspect-video block"
                                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                                allowFullScreen
                            />
                        </MediaWrapper>
                        {alt ? <figcaption className="label-s text-[var(--content-tertiary)] mt-2 text-center">{alt}</figcaption> : null}
                    </figure>
                );
            }

            return (
                <figure className="mb-4 lg:mb-6">
                    <MediaWrapper aspectRatio={aspectRatio ?? "3/2"} preserveAspectRatio={Boolean(aspectRatio)}>
                        <MarkdownImage src={source} alt={alt} sizes={markdownImageSizes} mediaMeta={mediaMeta} />
                    </MediaWrapper>
                    {alt ? <figcaption className="label-s text-[var(--content-tertiary)] mt-2 text-center">{alt}</figcaption> : null}
                </figure>
            );
        },
        h1: ({ children, ...props }) => {
            const id = slugify(extractText(children));
            return (
                <h1 id={id} className="blogh1 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props}>
                    {children}
                </h1>
            );
        },
        h2: ({ children, ...props }) => {
            const id = slugify(extractText(children));
            return (
                <h2 id={id} className="blogh2 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props}>
                    {children}
                </h2>
            );
        },
        h3: ({ children, ...props }) => {
            const id = slugify(extractText(children));
            return (
                <h3 id={id} className="blogh3 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props}>
                    {children}
                </h3>
            );
        },
        ul: (props) => <ul className="list-disc pl-6 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props} />,
        ol: (props) => <ol className="list-decimal pl-6 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props} />,
        li: (props) => <li className="mb-4 lg:mb-6 pl-1" {...props} />,
        blockquote: (props) => (
            <blockquote className="border-l-5 border-[var(--border-primary)] pl-3 mb-6 text-[var(--content-tertiary)]" {...props} />
        ),
        pre: ({ children }) => {
            const firstChild = children && Array.isArray(children) ? children[0] : children;

            if (
                firstChild &&
                typeof firstChild === "object" &&
                "props" in firstChild
            ) {
                const codeElement = firstChild as ReactElement<{ className?: string; children?: ReactNode }>;

                if (codeElement.props.className === "language-row") {
                    const raw = extractText(codeElement.props.children).trim();
                    const matches = Array.from(raw.matchAll(/!\[(.*?)\]\((.*?)\)/g));

                    if (matches.length > 0) {
                        return (
                            <div className={`flex flex-col md:flex-row gap-4 lg:gap-6 mb-4 lg:mb-6 ${post.layout !== "full" ? "lg:w-[calc(100%+80px)] lg:max-w-[720px] lg:-ml-[40px]" : ""}`}>
                                {matches.map((match, index) => {
                                    const source = match[2];
                                    const mediaMeta = getPostMediaMeta(source);
                                    const aspectRatio = mediaMeta?.aspectRatio;

                                    return (
                                        <div key={`${source}-${index}`} className="flex-1 min-w-0">
                                            <figure>
                                                <MediaWrapper aspectRatio={aspectRatio ?? "3/2"} preserveAspectRatio={Boolean(aspectRatio)}>
                                                    <MarkdownImage src={source} alt={match[1]} sizes={rowMarkdownImageSizes} mediaMeta={mediaMeta} />
                                                </MediaWrapper>
                                                {match[1] ? (
                                                    <figcaption className="label-s text-[var(--content-tertiary)] mt-2 text-center">
                                                        {match[1]}
                                                    </figcaption>
                                                ) : null}
                                            </figure>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }
                }
            }

            return <pre>{children}</pre>;
        },
    };

    return (
        <article className="flex flex-col">
            {post.bannerImage && (
                <figure className="relative w-full overflow-hidden rounded-b-xl lg:rounded-b-3xl bg-[var(--background-primary)] -mt-[64px] md:-mt-[102px] aspect-[16/6]">
                    <Image
                        loader={getImageLoader(post.bannerImage)}
                        src={post.bannerImage}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="100vw"
                        priority
                        data-original-src={post.bannerImage}
                    />
                </figure>
            )}

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className={`relative flex flex-col items-center lg:items-start w-full p-4 md:p-8 mx-auto gap-8 ${isDefaultLayout ? "max-w-[720px]" : ""}`}
            >
                <header className="w-full flex flex-col gap-4 items-start md:items-center">
                    <h1 className="text-start md:text-center text-[var(--content-primary)]">{post.title}</h1>
                    <div className="flex flex-col items-start md:items-center gap-4 text-[var(--content-tertiary)] label-s">
                        <div className="flex flex-col items-start md:items-center gap-2">
                            <time className="label-m" dateTime={post.date || undefined} suppressHydrationWarning>
                                {post.date ? formatDateWithOrdinal(post.date) : ""}
                            </time>
                        </div>
                        {post.tags && post.tags.length > 0 && (
                            <ul className="flex flex-wrap gap-1">
                                {post.tags.map((tag) => (
                                    <li key={tag} className="px-4 py-2 rounded-xl border-[var(--border-primary)] border-[0.4px]">
                                        {tag}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {post.buttonText && post.buttonLink && (
                            <Button href={post.buttonLink} openInNewTab>
                                {post.buttonText}
                            </Button>
                        )}
                    </div>
                </header>

                <div className="relative w-full">
                    <section className={`w-full ${post.layout === "full" ? "" : "max-w-[640px]"}`}>
                        <ReactMarkdown components={markdownComponents}>
                            {processContent(post.content || "")}
                        </ReactMarkdown>
                    </section>

                    {isDefaultLayout && headings.length > 0 && (
                        <aside className="hidden xl:block absolute top-0 left-[100%] ml-8 w-[200px] h-full pointer-events-none">
                            <div className="sticky top-[120px] pt-[8px] pointer-events-auto">
                                <TableOfContents headings={headings} />
                            </div>
                        </aside>
                    )}
                </div>

                <nav className="w-full flex justify-between items-center pt-4 md:pt-6 border-t border-[var(--border-primary)]" aria-label="Post navigation">
                    {prevPost ? <PostNavigationLink direction="previous" href={`/${type}/${prevPost.slug}`} /> : <span />}
                    {nextPost ? <PostNavigationLink direction="next" href={`/${type}/${nextPost.slug}`} /> : <span />}
                </nav>

                {filteredOtherPosts.length > 0 && (
                    <section className="w-full flex flex-col gap-5">
                        <h2 className="h4 text-[var(--content-primary)]">More {type}</h2>
                        <ul className="flex flex-col gap-4">
                            {filteredOtherPosts.map((otherPost) => (
                                <li key={otherPost.slug}>
                                    <Card
                                        image={otherPost.coverImage || ""}
                                        bannerImage={otherPost.bannerImage}
                                        title={otherPost.title}
                                        description={otherPost.description}
                                        link={`/${type}/${otherPost.slug}`}
                                        variant="list"
                                        aspectRatio="aspect-video"
                                    />
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </motion.div>
        </article>
    );
}
