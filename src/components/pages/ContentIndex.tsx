"use client";

import { useMemo, useState } from "react";
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
}: ContentIndexProps) {
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [introFinished, setIntroFinished] = useState(false);
    const [showCards, setShowCards] = useState(false);

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

    return (
        <div className="flex flex-col lg:flex-row w-full gap-6 lg:gap-8 h-auto lg:justify-left lg:row justify-center">
            <InfoBlock
                title={title}
                number={items.length}
                description={description}
                onComplete={() => setIntroFinished(true)}
            />

            <div className="w-full items-center lg:items-start flex flex-col">
                <Filter
                    tags={allTags}
                    activeTag={activeTag}
                    onTagSelect={setActiveTag}
                    animate={introFinished}
                    onAnimationComplete={() => setShowCards(true)}
                />

                {items.length > 0 ? (
                    <motion.div
                        className="w-full flex flex-col gap-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate={introFinished && showCards ? "visible" : "hidden"}
                    >
                        {itemsByYear.map(([year, yearItems]) => (
                            <div key={year} className="w-full flex flex-col md:flex-row gap-4 relative">
                                <div className="md:w-[0px] shrink-0 relative z-20 pointer-events-none">
                                    <span className="h3 text-[var(--content-primary)] [-webkit-text-stroke:0.4px_var(--background-primary)] sticky top-[134px] hidden md:block relative z-20">
                                        {year}
                                    </span>
                                </div>

                                <div className="w-full flex flex-col gap-4 relative z-0">
                                    <div className="md:hidden pb-2 select-none">
                                        <span className="h3 text-[var(--content-primary)]">{year}</span>
                                    </div>

                                    {yearItems.map((item) => (
                                        <motion.div key={item.slug} variants={cardVariants}>
                                            <Card
                                                image={item.coverImage || ""}
                                                title={item.title}
                                                description={item.description}
                                                link={`/${type}/${item.slug}`}
                                                tags={item.tags}
                                                variant="list"
                                                aspectRatio="aspect-video"
                                                locked={item.locked}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                ) : (
                    <Motion
                        type="fadeUpBouncy"
                        className="flex flex-col my-auto items-center w-full gap-7"
                        initial="initial"
                        animate={introFinished ? "animate" : "initial"}
                    >
                        <h5 className="my-auto h-full text-[var(--content-primary)]">{emptyMessage}</h5>
                    </Motion>
                )}
            </div>
        </div>
    );
}
