"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "motion/react";
import Button from "@/components/interface/Button";
import illustrations from "@/data/illustrations.json";

interface IllustrationItem {
    id: string;
    image: string;
}

interface IllustrationCardAnimatedProps {
    item: IllustrationItem;
    index: number;
    scrollYProgress: MotionValue<number>;
    start: number;
    end: number;
}

function IllustrationCardAnimated({
    item,
    index,
    scrollYProgress,
    start,
    end
}: IllustrationCardAnimatedProps) {
    // Calculate offset as percentage: 6 cards at 60% width, remaining 40% / 5 gaps = 8% per card
    const offsetPercent = index * 8;

    const x = useTransform(
        scrollYProgress,
        [start, end],
        ['100%', `${offsetPercent}%`]
    );

    const opacity = useTransform(
        scrollYProgress,
        [start, start + 0.05],
        [0, 1]
    );

    return (
        <motion.div
            className="absolute top-0 w-[60%]"
            style={{
                x,
                opacity,
                zIndex: index + 1
            }}
        >
            <div className="w-full p-2 rounded-[var(--radius-lg)] bg-[var(--background-secondary)]">
                <img
                    src={item.image}
                    alt={item.id}
                    className="w-full h-auto object-cover rounded-xl"
                />
            </div>
        </motion.div>
    );
}

export default function IllustrationsSection() {
    const sectionRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end end"]
    });

    const illustrationItems = illustrations.slice(0, 6) as IllustrationItem[];
    const buttonOpacity = useTransform(scrollYProgress, [0.85, 0.95], [0, 1]);

    return (
        <section
            ref={sectionRef}
            className="relative h-[400vh]"
        >
            <div className="sticky top-4 px-4 md:px-8 lg:px-20 py-8 md:py-12 overflow-hidden">
                {/* Header */}
                <div className="w-full max-w-[400px] flex flex-col gap-2 mb-8">
                    <h3>Illustrations</h3>
                    <p className="text-[var(--content-secondary)]">A gallery of lines, colors, shapes and forms.</p>
                </div>

                {/* Cards container - padding-bottom reserves space for absolute cards (60% width × ~1.5 aspect ratio = 90%) */}
                <div className="w-full relative pb-[90%]">
                    {illustrationItems.map((item, index) => {
                        // Stagger the animation timing for each card
                        const start = 0.1 + (index * 0.12);
                        const end = 0.2 + (index * 0.12);

                        return (
                            <IllustrationCardAnimated
                                key={item.id}
                                item={item}
                                index={index}
                                scrollYProgress={scrollYProgress}
                                start={start}
                                end={end}
                            />
                        );
                    })}
                </div>

                {/* Button - appears at the end */}
                <motion.div
                    className="mt-8"
                    style={{ opacity: buttonOpacity }}
                >
                    <Button to="/illustrations" variant="secondary">
                        See More
                    </Button>
                </motion.div>
            </div>
        </section>
    );
}
