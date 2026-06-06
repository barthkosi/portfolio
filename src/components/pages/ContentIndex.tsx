"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { motion, type Variants } from "motion/react";
import InfoBlock from "@/components/interface/InfoBlock";
import Card from "@/components/interface/Card";
import Filter from "@/components/interface/Filter";
import type { ContentItem, ContentType } from "@/lib/content";
import { Motion, springBouncy } from "@/lib/transitions";

interface ContentIndexProps {
    title: string;
    description: string;
    emptyMessage: string;
    items: ContentItem[];
    allTags: string[];
    type: ContentType;
    titleIcon?: ReactNode;
}

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
        transition: springBouncy,
    },
};

function getYearLabel(date: string) {
    return date ? `${date.substring(2, 4)}'` : "Unknown";
}

export default function ContentIndex({
    title,
    description,
    emptyMessage,
    items,
    allTags,
    type,
    titleIcon,
}: ContentIndexProps) {
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [introFinished, setIntroFinished] = useState(false);
    const [showCards, setShowCards] = useState(false);
    const [filterAnimationKey, setFilterAnimationKey] = useState(0);

    const filteredItems = useMemo(
        () =>
            activeTag
                ? items.filter((item) => item.tags?.includes(activeTag))
                : items,
        [activeTag, items]
    );

    const itemsByYear = useMemo(
        () =>
            Object.entries(
                filteredItems.reduce<Record<string, ContentItem[]>>((groups, item) => {
                    const year = getYearLabel(item.date);
                    groups[year] ??= [];
                    groups[year].push(item);
                    return groups;
                }, {})
            ).sort((a, b) => b[0].localeCompare(a[0])),
        [filteredItems]
    );

    const handleTagSelect = useCallback((tag: string | null) => {
        setActiveTag(tag);
        setFilterAnimationKey((currentKey) => currentKey + 1);
    }, []);

    return (
        <section className="flex flex-col lg:flex-row w-full gap-6 lg:gap-8 h-auto lg:justify-left lg:row justify-center">
            <InfoBlock
                title={title}
                number={items.length}
                description={description}
                titleIcon={titleIcon}
                onComplete={() => {
                    setIntroFinished(true);

                    if (allTags.length === 0) {
                        setShowCards(true);
                    }
                }}
            />

            <div className="w-full items-center lg:items-start flex flex-col">
                <Filter
                    tags={allTags}
                    activeTag={activeTag}
                    onTagSelect={handleTagSelect}
                    animate={introFinished}
                    onAnimationComplete={() => setShowCards(true)}
                />

                {items.length > 0 ? (
                    <motion.div
                        key={filterAnimationKey}
                        className="w-full flex flex-col gap-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate={introFinished && showCards ? "visible" : "hidden"}
                    >
                        {itemsByYear.map(([year, yearItems]) => (
                            <section key={year} className="w-full flex flex-row gap-4 relative">
                                <div className="w-[0px] shrink-0 relative z-20 pointer-events-none">
                                    <h2 className="h3 text-[var(--content-primary)] [text-shadow:5px_5px_0px_var(--border-primary)] sticky top-[64px] md:top-[134px] block relative z-20">
                                        {year}
                                    </h2>
                                </div>

                                <ul className="w-full flex flex-col gap-4 relative z-0">
                                    {yearItems.map((item) => (
                                        <motion.li key={`${filterAnimationKey}-${item.slug}`} variants={cardVariants}>
                                            <Card
                                                image={item.coverImage || ""}
                                                bannerImage={item.bannerImage}
                                                title={item.title}
                                                description={item.description}
                                                link={`/${type}/${item.slug}`}
                                                tags={item.tags}
                                                variant="list"
                                                aspectRatio="aspect-video"
                                                locked={item.locked}
                                            />
                                        </motion.li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </motion.div>
                ) : (
                    <Motion
                        type="fadeUpBouncy"
                        className="flex flex-col my-auto items-center w-full gap-7"
                        initial="initial"
                        animate={introFinished ? "animate" : "initial"}
                    >
                        <p className="h5 my-auto h-full text-[var(--content-primary)]">{emptyMessage}</p>
                    </Motion>
                )}
            </div>
        </section>
    );
}
