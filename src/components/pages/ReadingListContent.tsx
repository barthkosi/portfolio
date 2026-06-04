"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Masonry, type RenderComponentProps } from "masonic";
import InfoBlock from "@/components/interface/InfoBlock";
import Card from "@/components/interface/Card";
import Filter from "@/components/interface/Filter";
import Button from "@/components/interface/Button";
import books from "@/data/books.json";
import { useIsClient } from "@/hooks/useIsClient";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { springBouncy } from "@/lib/transitions";

const FAVORITES_TAG = "Favorites";
const OTHER_TAG = "Other";
const MORE_BOOKS_TEXT = "More Books";

type BookItem = {
    id: string;
    image: string;
    publicId: string;
    width: number;
    height: number;
    aspectRatio: number;
    title: string;
    author: string;
    link: string;
    tags: string[];
};

function shuffleArray<T>(array: T[]) {
    const shuffled = [...array];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        const temp = shuffled.at(index);
        const randVal = shuffled.at(randomIndex);
        if (temp !== undefined && randVal !== undefined) {
            shuffled.splice(index, 1, randVal);
            shuffled.splice(randomIndex, 1, temp);
        }
    }

    return shuffled;
}

type BookCardProps = {
    data: BookItem;
    index: number;
    isVisible: boolean;
};

function BookCard({
    data,
    index,
    isVisible,
}: BookCardProps) {
    return (
        <motion.article
            initial={{ opacity: 0, y: 30 }}
            animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ ...springBouncy, delay: index * 0.08 }}
        >
            <Card
                image={data.image}
                title={data.title}
                description={data.author}
                link={data.link}
                aspectRatio="auto"
                shimmerAspectRatio={`${data.width}/${data.height}`}
                imageWidth={data.width}
                imageHeight={data.height}
            />
        </motion.article>
    );
}

export default function ReadingListContent() {
    const isClient = useIsClient();
    const [areBooksVisible, setAreBooksVisible] = useState(false);
    const [activeTag, setActiveTag] = useState<string | null>(FAVORITES_TAG);
    const [filterAnimationKey, setFilterAnimationKey] = useState(0);
    const [shuffledBooks] = useState(() => shuffleArray(books));
    const { columnCount, gutter } = useResponsiveLayout();
    const allTags = useMemo(() => {
        const tags = new Set<string>();

        books.forEach((book) => {
            book.tags.forEach((tag) => tags.add(tag));
        });

        return [
            ...(tags.has(FAVORITES_TAG) ? [FAVORITES_TAG] : []),
            ...Array.from(tags)
                .filter((tag) => tag !== FAVORITES_TAG && tag !== OTHER_TAG)
                .sort((firstTag, secondTag) => firstTag.localeCompare(secondTag)),
            ...(tags.has(OTHER_TAG) ? [OTHER_TAG] : []),
        ];
    }, []);

    const filteredBooks = useMemo(
        () =>
            activeTag
                ? shuffledBooks.filter((book) => book.tags.includes(activeTag))
                : shuffledBooks,
        [activeTag, shuffledBooks]
    );
    const handleTagSelect = useCallback((tag: string | null) => {
        setActiveTag(tag);
        setFilterAnimationKey((currentKey) => currentKey + 1);
    }, []);

    const renderCard = useCallback(
        ({ data, index }: RenderComponentProps<BookItem>) => (
            <BookCard data={data} index={index} isVisible={areBooksVisible} />
        ),
        [areBooksVisible]
    );

    if (!isClient) {
        return null;
    }

    return (
        <section className="flex flex-col lg:flex-row w-full gap-7 lg:gap-8 h-auto lg:justify-left lg:row justify-center">
            <InfoBlock
                title="Reading List"
                number={books.length}
                description="Reading more is one of my biggest goals. This list shifts and grows as new titles find their way into my hands"
                onComplete={() => setAreBooksVisible(true)}
            />

            <div className="w-full items-center lg:items-start flex flex-col">
                <Filter
                    tags={allTags}
                    activeTag={activeTag}
                    onTagSelect={handleTagSelect}
                    animate={areBooksVisible}
                />

                <Masonry
                    key={`${filterAnimationKey}-${activeTag ?? "all"}-${columnCount}-${gutter}`}
                    items={filteredBooks}
                    itemKey={(book) => `${filterAnimationKey}-${book.id}`}
                    columnGutter={gutter}
                    columnCount={columnCount}
                    overscanBy={5}
                    render={renderCard}
                />

                {activeTag !== null && (
                    <div className="mt-5 w-full flex justify-center">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                                handleTagSelect(null);
                            }}
                        >
                            {MORE_BOOKS_TEXT}
                        </Button>
                    </div>
                )}
            </div>
        </section>
    );
}
