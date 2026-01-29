"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface LoadingScreenProps {
    progress: number;
    onComplete: () => void;
}

export default function LoadingScreen({ progress, onComplete }: LoadingScreenProps) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (progress >= 100 && !isExiting) {
            setIsExiting(true);
            const timer = setTimeout(() => {
                onComplete();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [progress, isExiting, onComplete]);

    return (
        <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background-primary)]"
            initial={{ opacity: 1 }}
            animate={{ opacity: isExiting ? 0 : 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="flex flex-col items-center gap-4">
                <div className="w-48 h-1 bg-[var(--background-secondary)] rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-[var(--content-primary)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                </div>
                <div className="label-s text-[var(--content-tertiary)]">
                    {Math.round(progress)}%
                </div>
            </div>
        </motion.div>
    );
}
