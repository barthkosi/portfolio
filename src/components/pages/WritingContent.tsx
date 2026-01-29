"use client";

import { useState, useEffect } from "react";
import { motion, Variants } from "motion/react";
import InfoBlock from "@/components/InfoBlock";
import Card from "@/components/Card";
import Filter from "@/components/Filter";
import { ContentItem } from "@/lib/content";
import { Motion, springBouncy } from "@/lib/transitions";

interface WritingContentProps {
    initialPosts: ContentItem[];
    allTags: string[];
}

export default function WritingContent({ initialPosts, allTags }: WritingContentProps) {
    const [posts] = useState<ContentItem[]>(initialPosts);
    const [filteredPosts, setFilteredPosts] = useState<ContentItem[]>(initialPosts);
    const [tags] = useState<string[]>(allTags);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [introFinished, setIntroFinished] = useState(false);
    const [showCards, setShowCards] = useState(false);

    useEffect(() => {
        if (activeTag) {
            setFilteredPosts(posts.filter(p => p.tags?.includes(activeTag)));
        } else {
            setFilteredPosts(posts);
        }
    }, [activeTag, posts]);

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2 },
        },
    };

    const cardVariants: Variants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: springBouncy
        },
    };

    return (
        <div className="flex flex-col lg:flex-row w-full gap-6 lg:gap-8 h-auto lg:justify-left lg:row justify-center">
            <InfoBlock
                title="Writing"
                number={posts.length}
                description="My internal monologues externalized, covering everything from tech to the messy human condition."
                onComplete={() => setIntroFinished(true)}
            />

            <div className="w-full items-center lg:items-start flex flex-col">
                <Filter
                    tags={tags}
                    activeTag={activeTag}
                    onTagSelect={setActiveTag}
                    animate={introFinished}
                    onAnimationComplete={() => setShowCards(true)}
                />

                {posts.length > 0 && (
                    <motion.div
                        className="w-full flex flex-col gap-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate={introFinished && showCards ? "visible" : "hidden"}
                    >
                        {Object.entries(
                            filteredPosts.reduce((acc, post) => {
                                const year = post.date ? `${post.date.substring(2, 4)}'` : "Unknown";
                                if (!acc[year]) acc[year] = [];
                                acc[year].push(post);
                                return acc;
                            }, {} as Record<string, typeof posts>)
                        )
                            .sort((a, b) => b[0].localeCompare(a[0])) // Sort years descending
                            .map(([year, yearPosts]) => (
                                <div key={year} className="w-full flex flex-col md:flex-row gap-4 relative">
                                    {/* Desktop Year Label */}
                                    <div className="md:w-[0px] shrink-0 z-[2]">
                                        <span className="h3 text-[var(--content-primary)] sticky top-[134px] hidden md:block">
                                            {year}
                                        </span>
                                    </div>

                                    <div className="w-full flex flex-col gap-4">
                                        {/* Mobile Year Label */}
                                        <div className="md:hidden pb-2 select-none">
                                            <span className="h3 text-[var(--content-primary)]">{year}</span>
                                        </div>

                                        {yearPosts.map((post) => (
                                            <motion.div key={post.slug} variants={cardVariants}>
                                                <Card
                                                    image={post.coverImage || ""}
                                                    title={post.title}
                                                    description={post.description}
                                                    link={`/writing/${post.slug}`}
                                                    tags={post.tags}
                                                    variant="list"
                                                    aspectRatio="16/9"
                                                />
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                    </motion.div>
                )}

                {posts.length === 0 && (
                    <div className="flex flex-col my-auto items-center w-full gap-4">
                        <h3 className="my-auto h-full text-[var(--content-tertiary)]"></h3>
                    </div>
                )}
            </div>
        </div>
    );
}
