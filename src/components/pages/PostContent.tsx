"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import React from 'react';
import Card from '@/components/interface/Card';
import { ContentItem, ContentType } from '@/lib/content';

const MediaWrapper = ({ children, aspectRatio = '16/9' }: { children: React.ReactNode, aspectRatio?: string, type?: 'image' | 'video' }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div
            className={`relative overflow-hidden rounded-[12px] w-full bg-[var(--background-secondary)] transition-all duration-300 ${!isLoaded ? 'shimmer-loading' : ''}`}
            style={{ aspectRatio: isLoaded ? 'auto' : aspectRatio }}
        >
            <div className={`w-full transition-opacity duration-500 ${isLoaded ? 'opacity-100 h-auto' : 'opacity-0 h-full'}`}>
                {React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<any>, {
                    onLoad: () => setIsLoaded(true),
                    onLoadedData: () => setIsLoaded(true),
                }) : children}
            </div>
        </div>
    );
};

import Button from '@/components/interface/Button';
import Link from 'next/link';

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

// Pre-process markdown: convert ::: blocks into ```row fenced code blocks
const processContent = (content: string) => {
    return content.replace(/^:::[ ]*\r?\n([\s\S]*?)^:::[ ]*$/gm, (_, block: string) => {
        return '```row\n' + block.trim() + '\n```';
    });
};

// Slugify a heading text into a valid HTML id
const slugify = (text: string): string =>
    text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/[\s_]+/g, '-');

// Extract H1/H2/H3 headings from raw markdown content
const extractHeadings = (content: string): HeadingItem[] => {
    const lines = content.split('\n');
    const headings: HeadingItem[] = [];
    for (const line of lines) {
        const h1 = line.match(/^#\s+(.+)/);
        const h2 = line.match(/^##\s+(.+)/);
        const h3 = line.match(/^###\s+(.+)/);
        if (h3) {
            const text = h3[1].trim();
            headings.push({ id: slugify(text), text, level: 3 });
        } else if (h2) {
            const text = h2[1].trim();
            headings.push({ id: slugify(text), text, level: 2 });
        } else if (h1) {
            const text = h1[1].trim();
            headings.push({ id: slugify(text), text, level: 1 });
        }
    }
    return headings;
};

function TableOfContents({ headings }: { headings: HeadingItem[] }) {
    const [activeId, setActiveId] = useState<string>('');
    const containerRef = useRef<HTMLElement>(null);
    const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
    const clipRectRef = useRef<SVGRectElement>(null);

    const [pathData, setPathData] = useState<string>('');
    const [pathHeight, setPathHeight] = useState<number>(0);

    // Initial path generation and resize observer
    useEffect(() => {
        if (!containerRef.current || headings.length === 0) return;

        const updatePath = () => {
            if (!containerRef.current || headings.length === 0) return;
            const containerTop = containerRef.current.getBoundingClientRect().top;
            let path = '';
            let lastPt: { x: number, y: number } | null = null;
            let maxY = 0;

            headings.forEach((h, i) => {
                const el = itemRefs.current[h.id];
                if (!el) return;
                const rect = el.getBoundingClientRect();
                const y = Math.max(0, rect.top - containerTop + rect.height / 2);
                maxY = Math.max(maxY, y);

                // Adjust x based on level to create the curve
                const x = h.level === 1 ? 2 : h.level === 2 ? 10 : 18;

                if (i === 0) {
                    path += `M ${x} ${y}`;
                } else if (lastPt) {
                    const cy = (lastPt.y + y) / 2;
                    path += ` C ${lastPt.x} ${cy}, ${x} ${cy}, ${x} ${y}`;
                }
                lastPt = { x, y };
            });
            setPathData(path);
            setPathHeight(maxY + 10);
        };

        // Small delay to ensure fonts/layout are stable
        const timeoutId = setTimeout(updatePath, 100);
        window.addEventListener('resize', updatePath);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', updatePath);
        };
    }, [headings]);

    // Scroll listener for SVG height and active state
    useEffect(() => {
        if (headings.length === 0 || !containerRef.current) return;

        let ticking = false;

        const updateScroll = () => {
            if (!containerRef.current || headings.length === 0) return;
            const scrollY = window.scrollY;
            const OFFSET = 120; // Accounting for fixed header
            const pageHeadings = headings.map(h => {
                const el = document.getElementById(h.id);
                return {
                    id: h.id,
                    top: el ? el.getBoundingClientRect().top + window.scrollY - OFFSET : 0
                };
            });

            let targetY = 0;
            let currentActiveId = headings[0].id;
            const cTop = containerRef.current.getBoundingClientRect().top;

            if (scrollY < pageHeadings[0].top) {
                targetY = 0;
                currentActiveId = '';
            } else if (scrollY >= pageHeadings[pageHeadings.length - 1].top) {
                const lastId = pageHeadings[pageHeadings.length - 1].id;
                currentActiveId = lastId;
                const el = itemRefs.current[lastId];
                if (el) targetY = el.getBoundingClientRect().top - cTop + el.getBoundingClientRect().height / 2;
            } else {
                for (let i = 0; i < pageHeadings.length - 1; i++) {
                    const curr = pageHeadings[i];
                    const next = pageHeadings[i + 1];
                    if (scrollY >= curr.top && scrollY < next.top) {
                        currentActiveId = curr.id;
                        const progress = (scrollY - curr.top) / (next.top - curr.top);
                        const elCurr = itemRefs.current[curr.id];
                        const elNext = itemRefs.current[next.id];

                        if (elCurr && elNext) {
                            const y1 = elCurr.getBoundingClientRect().top - cTop + elCurr.getBoundingClientRect().height / 2;
                            const y2 = elNext.getBoundingClientRect().top - cTop + elNext.getBoundingClientRect().height / 2;
                            targetY = y1 + progress * (y2 - y1);
                        }
                        break;
                    }
                }
            }

            if (clipRectRef.current) {
                clipRectRef.current.setAttribute('height', Math.max(0, targetY).toString());
            }

            setActiveId(currentActiveId);
        };

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    updateScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        updateScroll(); // initial call

        return () => window.removeEventListener('scroll', handleScroll);
    }, [headings]);

    if (headings.length === 0) return null;

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const el = document.getElementById(id);
        if (el) {
            const offset = 100;
            const top = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
            setActiveId(id);
        }
    };

    return (
        <nav ref={containerRef as React.RefObject<HTMLDivElement>} className="relative flex flex-col gap-1 w-[200px] pl-6">
            <span className="label-s text-[var(--content-tertiary)] mb-2 opacity-60 uppercase tracking-wider relative -left-6">
                On this page
            </span>

            {pathData && (
                <svg
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{ width: 24, height: pathHeight + 10, overflow: 'visible' }}
                >
                    <path
                        d={pathData}
                        fill="none"
                        className="stroke-[var(--border-primary)]"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    <path
                        d={pathData}
                        fill="none"
                        className="stroke-[var(--content-primary)]"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        clipPath="url(#active-line-clip)"
                    />
                    <clipPath id="active-line-clip">
                        <rect ref={clipRectRef} x="-10" y="-10" width="40" height="0" />
                    </clipPath>

                    {/* Add small connection dots at each heading */}
                    {headings.map((h, i) => {
                        const el = itemRefs.current[h.id];
                        if (!el || !containerRef.current) return null;
                        const rect = el.getBoundingClientRect();
                        const cTop = containerRef.current.getBoundingClientRect().top;
                        const y = Math.max(0, rect.top - cTop + rect.height / 2);
                        const x = h.level === 1 ? 2 : h.level === 2 ? 10 : 18;

                        // Check if the current heading is before or equal to the active heading
                        const activeIndex = headings.findIndex(h => h.id === activeId);
                        const isPassed = i <= activeIndex;

                        return (
                            <circle
                                key={`dot-${h.id}`}
                                cx={x}
                                cy={y}
                                r="3"
                                className={`transition-all duration-300 ${isPassed ? 'fill-[var(--content-primary)]' : 'fill-[var(--background-primary)] stroke-[var(--border-primary)] stroke-2'}`}
                            />
                        );
                    })}
                </svg>
            )}

            {headings.map(({ id, text, level }) => {
                const isActive = activeId === id;
                return (
                    <a
                        key={id}
                        ref={(el) => { itemRefs.current[id] = el; }}
                        href={`#${id}`}
                        onClick={(e) => handleClick(e, id)}
                        className={`
                                group flex items-start py-1 transition-all duration-200 relative
                                ${level === 2 ? 'pl-2' : level === 3 ? 'pl-4' : ''}
                            `}
                    >
                        <span
                            className={`
                                    label-s leading-snug transition-colors duration-200
                                    ${isActive
                                    ? 'text-[var(--content-primary)] font-medium'
                                    : 'text-[var(--content-tertiary)] group-hover:text-[var(--content-secondary)]'
                                }
                                `}
                        >
                            {text}
                        </span>
                    </a>
                );
            })}
        </nav>
    );
}

export default function PostContent({ post, otherPosts, type, prevPost, nextPost }: PostContentProps) {
    if (!post) return null;

    const isDefaultLayout = post.layout !== 'full';
    const headings = isDefaultLayout ? extractHeadings(post.content || '') : [];

    return (
        <main className="flex flex-col">
            {post.bannerImage && (
                <div className="relative w-full overflow-hidden bg-[var(--background-primary)] -mt-[64px] md:-mt-[102px] aspect-[16/6]">
                    <Image src={post.bannerImage} alt={post.title} fill className="object-cover" sizes="100vw" priority />
                </div>
            )}

            <div className={`relative flex flex-col items-center lg:items-start w-full p-4 md:p-8 mx-auto gap-8 ${isDefaultLayout ? 'max-w-[720px]' : ''}`}>

                <div className="w-full flex flex-col gap-4 items-start md:items-center">
                    <h1 className="text-start md:text-center text-[var(--content-primary)]">{post.title}</h1>
                    <div className="flex flex-col items-start md:items-center gap-4 text-[var(--content-tertiary)] label-s">
                        <div className="flex flex-col items-start md:items-center gap-2">
                            <span className='label-m'>{new Date(post.date || "").toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {post.tags && post.tags.length > 0 && post.tags.map(tag => (
                                <span key={tag} className='px-4 py-2 rounded-xl border-[var(--border-primary)] border-[0.4px]'>{tag}</span>
                            ))}
                        </div>
                        {post.buttonText && post.buttonLink && (
                            <Button
                                href={post.buttonLink}
                                openInNewTab
                            >
                                {post.buttonText}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="relative w-full">
                    <article className={`w-full ${post.layout === 'full' ? '' : 'max-w-[640px]'}`}>
                        <ReactMarkdown
                            components={{
                                p: ({ node, children, ...rest }) => {
                                    const childNodes = (node as any)?.children ?? [];
                                    const isMediaOnly = childNodes.length > 0 && childNodes.every(
                                        (child: any) => child.type === 'element' && child.tagName === 'img'
                                    );
                                    if (isMediaOnly) return <>{children}</>;
                                    return <p className="blog-text mb-4 lg:mb-6 text-[var(--content-primary)]" {...rest}>{children}</p>;
                                },
                                a: (props) => <a className="blog-text mb-4 lg:mb-6 text-[var(--content-link)] hover:text-[var(--content-link-hover)] transition-colors" {...props} />,
                                img: (props) => {
                                    const src = String(props.src || '');
                                    const alt = props.alt || '';
                                    if (src.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
                                        return (
                                            <figure className="mb-4 lg:mb-6">
                                                <MediaWrapper aspectRatio="16/9" type="video">
                                                    <video
                                                        src={src}
                                                        className="w-full h-auto block"
                                                        autoPlay
                                                        loop
                                                        muted
                                                        playsInline
                                                    />
                                                </MediaWrapper>
                                                {alt && <figcaption className="label-s text-[var(--content-tertiary)] mt-2 text-center">{alt}</figcaption>}
                                            </figure>
                                        );
                                    }
                                    if (src.includes('player.cloudinary.com/embed')) {
                                        return (
                                            <figure className="mb-4 lg:mb-6">
                                                <MediaWrapper aspectRatio="16/9" type="video">
                                                    <iframe
                                                        src={src}
                                                        className="w-full aspect-video block"
                                                        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                </MediaWrapper>
                                                {alt && <figcaption className="label-s text-[var(--content-tertiary)] mt-2 text-center">{alt}</figcaption>}
                                            </figure>
                                        );
                                    }
                                    return (
                                        <figure className="mb-4 lg:mb-6">
                                            <MediaWrapper aspectRatio="3/2" type="image">
                                                <img className="w-full h-auto block" {...props} />
                                            </MediaWrapper>
                                            {alt && <figcaption className="label-s text-[var(--content-tertiary)] mt-2 text-center">{alt}</figcaption>}
                                        </figure>
                                    );
                                },
                                h1: ({ children, ...props }) => {
                                    const text = typeof children === 'string' ? children : String(children);
                                    const id = slugify(text);
                                    return <h1 id={id} className="blogh1 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props}>{children}</h1>;
                                },
                                h2: ({ children, ...props }) => {
                                    const text = typeof children === 'string' ? children : String(children);
                                    const id = slugify(text);
                                    return <h2 id={id} className="blogh2 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props}>{children}</h2>;
                                },
                                h3: ({ children, ...props }) => {
                                    const text = typeof children === 'string' ? children : String(children);
                                    const id = slugify(text);
                                    return <h3 id={id} className="blogh3 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props}>{children}</h3>;
                                },
                                ul: (props) => <ul className="list-disc pl-6 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props} />,
                                ol: (props) => <ol className="list-decimal pl-6 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props} />,
                                li: (props) => <li className="mb-4 lg:mb-6 pl-1" {...props} />,
                                blockquote: (props) => <blockquote className="border-l-5 border-[var(--border-primary)] pl-3 mb-6 text-[var(--content-tertiary)]" {...props} />,
                                pre: ({ children }) => {
                                    const child = React.Children.toArray(children)[0];
                                    if (React.isValidElement(child)) {
                                        const codeProps = child.props as any;
                                        if (codeProps.className === 'language-row') {
                                            const raw = String(codeProps.children).trim();
                                            const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
                                            const images: { alt: string; src: string }[] = [];
                                            let match;
                                            while ((match = imageRegex.exec(raw)) !== null) {
                                                images.push({ alt: match[1], src: match[2] });
                                            }
                                            if (images.length > 0) {
                                                return (
                                                    <div className={`flex flex-col md:flex-row gap-4 lg:gap-6 mb-4 lg:mb-6 ${post.layout !== 'full' ? 'lg:w-[calc(100%+80px)] lg:max-w-[720px] lg:-ml-[40px]' : ''}`}>
                                                        {images.map((img, i) => (
                                                            <div key={i} className="flex-1 min-w-0">
                                                                <figure>
                                                                    <div className="rounded-[12px] overflow-hidden">
                                                                        <img className="w-full h-auto block" src={img.src} alt={img.alt} />
                                                                    </div>
                                                                    {img.alt && <figcaption className="label-s text-[var(--content-tertiary)] mt-2 text-center">{img.alt}</figcaption>}
                                                                </figure>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                        }
                                    }
                                    return <pre>{children}</pre>;
                                },
                            }}
                        >
                            {processContent(post.content || "")}
                        </ReactMarkdown>
                    </article>

                    {/* Sticky TOC — desktop only, default layout only */}
                    {isDefaultLayout && headings.length > 0 && (
                        <aside className="hidden xl:block absolute top-0 left-[100%] ml-8 w-[200px] h-full pointer-events-none">
                            <div className="sticky top-[120px] pt-[8px] pointer-events-auto">
                                <TableOfContents headings={headings} />
                            </div>
                        </aside>
                    )}
                </div>

                <div className="w-full flex justify-between items-center pt-4 md:pt-6 border-t border-[var(--border-primary)]">
                    {prevPost ? (
                        <Link
                            href={`/${type}/${prevPost.slug}`}
                            className="flex flex-row label-m text-[var(--content-primary)] hover:text-[var(--content-secondary)] transition-colors"
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M11.7803 14.7803C12.0732 14.4874 12.0732 14.0126 11.7803 13.7197L8.06066 10L11.7803 6.28033C12.0732 5.98744 12.0732 5.51256 11.7803 5.21967C11.4874 4.92678 11.0126 4.92678 10.7197 5.21967L6.46967 9.46967C6.32902 9.61032 6.25 9.80109 6.25 10C6.25 10.1989 6.32902 10.3897 6.46967 10.5303L10.7197 14.7803C11.0126 15.0732 11.4874 15.0732 11.7803 14.7803Z" fill="currentColor" />
                            </svg>
                            Previous
                        </Link>
                    ) : <span />}
                    {nextPost ? (
                        <Link
                            href={`/${type}/${nextPost.slug}`}
                            className="flex flex-row label-m text-[var(--content-primary)] hover:text-[var(--content-secondary)] transition-colors"
                        >
                            Next
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M8.21967 14.7803C7.92678 14.4874 7.92678 14.0126 8.21967 13.7197L11.9393 10L8.21967 6.28033C7.92678 5.98744 7.92678 5.51256 8.21967 5.21967C8.51256 4.92678 8.98744 4.92678 9.28033 5.21967L13.5303 9.46967C13.671 9.61032 13.75 9.80109 13.75 10C13.75 10.1989 13.671 10.3897 13.5303 10.5303L9.28033 14.7803C8.98744 15.0732 8.51256 15.0732 8.21967 14.7803Z" fill="currentColor" />
                            </svg>
                        </Link>
                    ) : <span />}
                </div>

                {otherPosts.filter(p => !p.locked).length > 0 && (
                    <div className="w-full flex flex-col gap-5">
                        <h3 className="h4 text-[var(--content-primary)]">More {type}</h3>
                        <div className="flex flex-col gap-4">
                            {otherPosts.filter(p => !p.locked).map(p => (
                                <Card
                                    key={p.slug}
                                    image={p.coverImage || ""}
                                    title={p.title}
                                    description={p.description}
                                    link={`/${type}/${p.slug}`}
                                    variant="list"
                                    aspectRatio="aspect-video"
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
