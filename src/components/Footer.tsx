"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { anim } from "@/lib/transitions";
import { useLoading } from "@/context/LoadingContext";

export default function Footer() {
    const { isContentReady } = useLoading();

    return (
        <motion.footer
            className="w-full max-w-[1440px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-4 md:p-8 text-[var(--content-secondary)]"
            initial={anim.fadeUp.initial}
            animate={isContentReady ? anim.fadeUp.animate : anim.fadeUp.initial}
        >
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 label-s">
                <Link href="/work" className="hover:text-[var(--content-primary)] transition-colors">
                    Work
                </Link>
                <Link href="/explorations" className="hover:text-[var(--content-primary)] transition-colors">
                    Explorations
                </Link>
                <Link href="/illustrations" className="hover:text-[var(--content-primary)] transition-colors">
                    Illustrations
                </Link>
                <Link href="/archive" className="hover:text-[var(--content-primary)] transition-colors">
                    Archive
                </Link>
                <Link href="/reading-list" className="hover:text-[var(--content-primary)] transition-colors">
                    Reading List
                </Link>
                <Link href="/writing" className="hover:text-[var(--content-primary)] transition-colors">
                    Writing
                </Link>
            </div>

            <div className="flex flex-row gap-4 label-s">
                <a
                    href="https://x.com/barthkosi/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--content-primary)] transition-colors"
                >
                    X (Twitter)
                </a>
                <a
                    href="https://cosmos.so/barthkosi/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--content-primary)] transition-colors"
                >
                    Cosmos
                </a>
                <a
                    href="https://www.linkedin.com/in/barthkosi/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--content-primary)] transition-colors"
                >
                    LinkedIn
                </a>
                <a
                    href="https://github.com/barthkosi/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--content-primary)] transition-colors"
                >
                    GitHub
                </a>
            </div>
        </motion.footer>
    );
}
