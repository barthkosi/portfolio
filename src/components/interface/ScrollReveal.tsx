"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, MotionValue } from "motion/react";

interface ScrollRevealProps {
    children: string;
    className?: string;
}

interface CharProps {
    children: string;
    progress: MotionValue<number>;
    range: [number, number];
}

const REVEAL_ANCHOR = 0.8;

const Char = ({ children, progress, range }: CharProps) => {
    const opacity = useTransform(progress, range, [0.2, 1]);

    return (
        <motion.span
            style={{ opacity }}
            className="inline text-[var(--content-primary)]"
        >
            {children === " " ? "\u00A0" : children}
        </motion.span>
    );
};

export default function ScrollReveal({ children, className }: ScrollRevealProps) {
    const paragraphRef = useRef<HTMLParagraphElement>(null);
    const scrollYProgress = useMotionValue(0);

    useEffect(() => {
        const updateProgress = () => {
            const paragraph = paragraphRef.current;
            if (!paragraph) return;

            const paragraphRect = paragraph.getBoundingClientRect();
            const revealAnchorY = window.innerHeight * REVEAL_ANCHOR;
            const paragraphHeight = Math.max(paragraphRect.height, 1);
            const progress = (revealAnchorY - paragraphRect.top) / paragraphHeight;

            scrollYProgress.set(Math.max(0, Math.min(1, progress)));
        };

        updateProgress();

        window.addEventListener("scroll", updateProgress, { passive: true });
        window.addEventListener("resize", updateProgress);

        return () => {
            window.removeEventListener("scroll", updateProgress);
            window.removeEventListener("resize", updateProgress);
        };
    }, [scrollYProgress]);

    const words = children.split(" ");
    const chars = children.split("");

    return (
        <div className={className}>
            <p
                ref={paragraphRef}
                className="h4 break-words"
                style={{ wordWrap: "break-word", overflowWrap: "break-word" }}
            >
                {words.map((word, wordIndex) => {
                    // Calculate the starting index of the current word in the original string
                    // We sum the lengths of all previous words plus the spaces between them
                    let startIndex = 0;
                    for (let i = 0; i < wordIndex; i++) {
                        startIndex += words[i].length + 1; // +1 for the space
                    }

                    return (
                        <span key={wordIndex} className="inline-block whitespace-nowrap">
                            {word.split("").map((char, charIndex) => {
                                const globalIndex = startIndex + charIndex;
                                const start = globalIndex / chars.length;
                                const end = start + 1 / chars.length;
                                return (
                                    <Char key={globalIndex} progress={scrollYProgress} range={[start, end]}>
                                        {char}
                                    </Char>
                                );
                            })}
                            {wordIndex < words.length - 1 && (
                                <span className="inline-block">&nbsp;</span>
                            )}
                        </span>
                    );
                })}
            </p>
        </div>
    );
}
