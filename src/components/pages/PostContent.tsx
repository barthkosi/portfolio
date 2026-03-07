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
    level: 2 | 3;
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

// Extract H2/H3 headings from raw markdown content
const extractHeadings = (content: string): HeadingItem[] => {
    const lines = content.split('\n');
    const headings: HeadingItem[] = [];
    for (const line of lines) {
        const h2 = line.match(/^##\s+(.+)/);
        const h3 = line.match(/^###\s+(.+)/);
        if (h3) {
            const text = h3[1].trim();
            headings.push({ id: slugify(text), text, level: 3 });
        } else if (h2) {
            const text = h2[1].trim();
            headings.push({ id: slugify(text), text, level: 2 });
        }
    }
    return headings;
};

// Table of Contents sidebar component
function TableOfContents({ headings }: { headings: HeadingItem[] }) {
    const [activeId, setActiveId] = useState<string>('');
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        if (headings.length === 0) return;

        const handleIntersect = (entries: IntersectionObserverEntry[]) => {
            // Find the topmost visible heading
            const visible = entries
                .filter(e => e.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

            if (visible.length > 0) {
                setActiveId(visible[0].target.id);
            }
        };

        observerRef.current = new IntersectionObserver(handleIntersect, {
            rootMargin: '-80px 0px -60% 0px',
            threshold: 0,
        });

        headings.forEach(({ id }) => {
            const el = document.getElementById(id);
            if (el) observerRef.current?.observe(el);
        });

        return () => observerRef.current?.disconnect();
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
        <nav className="flex flex-col gap-1 w-[200px]">
            <span className="label-s text-[var(--content-tertiary)] mb-2 opacity-60 uppercase tracking-wider">
                On this page
            </span>
            {headings.map(({ id, text, level }) => {
                const isActive = activeId === id;
                return (
                    <a
                        key={id}
                        href={`#${id}`}
                        onClick={(e) => handleClick(e, id)}
                        className={`
                                group flex items-start gap-2 py-1 transition-all duration-200
                                ${level === 3 ? 'pl-3' : ''}
                            `}
                    >
                        <span
                            className={`
                                    mt-[6px] shrink-0 w-[2px] rounded-full transition-all duration-200
                                    ${isActive
                                    ? 'h-[14px] bg-[var(--content-primary)]'
                                    : 'h-[10px] bg-[var(--border-primary)] group-hover:bg-[var(--content-secondary)]'
                                }
                                `}
                        />
                        <span
                            className={`
                                    label-s leading-snug transition-colors duration-200
                                    ${isActive
                                    ? 'text-[var(--content-primary)]'
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
                            {post.author && <span className='label-m'>{post.author}</span>}
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
                                h1: (props) => <h1 className="h3 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props} />,
                                h2: ({ children, ...props }) => {
                                    const text = typeof children === 'string' ? children : String(children);
                                    const id = slugify(text);
                                    return <h2 id={id} className="h4 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props}>{children}</h2>;
                                },
                                h3: ({ children, ...props }) => {
                                    const text = typeof children === 'string' ? children : String(children);
                                    const id = slugify(text);
                                    return <h3 id={id} className="h5 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props}>{children}</h3>;
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
