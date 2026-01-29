"use client";

import { motion } from "motion/react";
import { Masonry, RenderComponentProps } from "masonic";
import { springBouncy } from "@/lib/transitions";
import { useState, useMemo, useCallback, useEffect } from "react";
import InfoBlock from "@/components/InfoBlock";
import Card from "@/components/Card";
import books from "@/data/books.json";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

type BookItem = {
    id: string;
    image: string;
    title: string;
    author: string;
    link: string;
};

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Masonry card component for books
const BookCard = ({
    data,
    index,
    isVisible,
}: RenderComponentProps<BookItem> & { isVisible: boolean }) => (
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
        />
    </motion.div>
);

export default function ReadingListContent() {
    const [areBooksVisible, setAreBooksVisible] = useState(false);
    const { columnCount, gutter } = useResponsiveLayout();

    // Shuffle books once when component mounts
    const shuffledBooks = useMemo(() => shuffleArray(books), []);

    const bookCount = books.length;

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const renderCard = useCallback(
        (props: RenderComponentProps<BookItem>) => (
            <BookCard {...props} isVisible={areBooksVisible} />
        ),
        [areBooksVisible]
    );



    return (
        <div className="flex flex-col lg:flex-row w-full gap-7 lg:gap-8 h-auto lg:justify-left lg:row justify-center">
            <InfoBlock
                title="Reading List"
                number={bookCount}
                description="Reading more is one of my biggest goals. This list shifts and grows as new titles find their way into my hands"
                onComplete={() => setAreBooksVisible(true)}
            />

            <div className="w-full">
                {mounted && (
                    <Masonry
                        key={`${columnCount}-${gutter}`}
                        items={shuffledBooks}
                        columnGutter={gutter}
                        columnCount={columnCount}
                        overscanBy={5}
                        render={renderCard}
                    />
                )}
            </div>
        </div>
    );
}
