"use client";

import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import React from 'react';
import Card from '@/components/Card';
import { ContentItem, ContentType } from '@/lib/content';

const MediaWrapper = ({ children, aspectRatio = '16/9' }: { children: React.ReactNode, aspectRatio?: string, type?: 'image' | 'video' }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div
            className={`relative overflow-hidden rounded-[12px] w-full lg:w-[calc(100%+80px)] lg:max-w-[720px] lg:-ml-[40px] bg-[var(--background-secondary)] transition-all duration-300 ${!isLoaded ? 'shimmer-loading' : ''}`}
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

interface PostContentProps {
    post: ContentItem;
    otherPosts: ContentItem[];
    type: ContentType;
}

export default function PostContent({ post, otherPosts, type }: PostContentProps) {
    if (!post) return null;

    return (
        <main className="flex flex-col">
            {post.bannerImage && (
                <div className="w-full overflow-hidden bg-[var(--background-primary)] -mt-[64px] md:-mt-[102px]">
                    <img src={post.bannerImage} alt={post.title} className="w-full aspect-[16/9] lg:aspect-[1500/300] object-cover" />
                </div>
            )}

            <div className="flex flex-col max-w-[720px] items-center lg:items-start w-full p-4 md:p-8 mx-auto gap-8">

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
                            <a
                                href={post.buttonLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="label-m px-4 py-2 rounded-xl bg-[var(--background-secondary)] text-[var(--content-primary)] hover:bg-[var(--background-tertiary)] transition-colors"
                            >
                                {post.buttonText}
                            </a>
                        )}
                    </div>
                </div>

                <article className="w-full max-w-[640px]">
                    <ReactMarkdown
                        components={{
                            p: (props) => <p className="blog-text mb-4 lg:mb-6 text-[var(--content-primary)]" {...props} />,
                            a: (props) => <a className="blog-text mb-4 lg:mb-6 text-[var(--content-link)] hover:text-[var(--content-link-hover)] transition-colors" {...props} />,
                            img: (props) => {
                                const src = props.src || '';
                                // Detect video file extensions
                                if (src.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
                                    return (
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
                                    );
                                }
                                // Detect Cloudinary video player embeds
                                if (src.includes('player.cloudinary.com/embed')) {
                                    return (
                                        <MediaWrapper aspectRatio="16/9" type="video">
                                            <iframe
                                                src={src}
                                                className="w-full aspect-video block"
                                                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </MediaWrapper>
                                    );
                                }
                                return (
                                    <MediaWrapper aspectRatio="3/2" type="image">
                                        <img className="w-full h-auto block" {...props} alt={props.alt || ""} />
                                    </MediaWrapper>
                                );
                            },
                            h1: (props) => <h1 className="h3 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props} />,
                            h2: (props) => <h2 className="h4 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props} />,
                            h3: (props) => <h3 className="h5 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props} />,
                            ul: (props) => <ul className="list-disc pl-6 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props} />,
                            ol: (props) => <ol className="list-decimal pl-6 mb-4 lg:mb-6 text-[var(--content-primary)]" {...props} />,
                            li: (props) => <li className="mb-4 lg:mb-6 pl-1" {...props} />,
                            blockquote: (props) => <blockquote className="border-l-5 border-[var(--border-primary)] pl-3 mb-6 text-[var(--content-tertiary)]" {...props} />,
                        }}
                    >
                        {post.content || ""}
                    </ReactMarkdown>
                </article>

                <div className="w-full flex justify-between items-center pt-4 md:pt-6 border-t border-[var(--border-primary)]">
                    {/* Navigation logic would go here if we had full list context, skipping Next/Prev for simplicity or implementing later if critical. 
                        The original code computed next/prev from allPosts state. We can pass next/prev slugs from server if needed.
                        For now, preserving "More {type}" below.
                    */}
                </div>

                {otherPosts.length > 0 && (
                    <div className="w-full flex flex-col gap-5">
                        <h3 className="h4 text-[var(--content-primary)]">More {type}</h3>
                        <div className="flex flex-col gap-4">
                            {otherPosts.map(p => (
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
