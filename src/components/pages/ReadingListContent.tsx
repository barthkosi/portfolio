"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Masonry, type RenderComponentProps } from "masonic";
import InfoBlock from "@/components/interface/InfoBlock";
import Card from "@/components/interface/Card";
import Filter from "@/components/interface/Filter";
import books from "@/data/books.json";
import { useIsClient } from "@/hooks/useIsClient";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { springBouncy } from "@/lib/transitions";

const FAVORITES_TAG = "Favorites";
const OTHER_TAG = "Other";

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
        [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
}

function BookCard({
    data,
    index,
    isVisible,
}: RenderComponentProps<BookItem> & { isVisible: boolean }) {
    return (
        <motion.div
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
        </motion.div>
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
        (props: RenderComponentProps<BookItem>) => <BookCard {...props} isVisible={areBooksVisible} />,
        [areBooksVisible]
    );

    if (!isClient) {
        return null;
    }

    return (
        <div className="flex flex-col lg:flex-row w-full gap-7 lg:gap-8 h-auto lg:justify-left lg:row justify-center">
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
            </div>
        </div>
    );
}
