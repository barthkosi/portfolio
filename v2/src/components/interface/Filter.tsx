"use client";

import { pressScale, springBouncy } from "@/lib/transitions";
import { motion, Variants } from "motion/react";

interface FilterProps {
  tags?: string[];
  activeTag?: string | null;
  onTagSelect?: (tag: string | null) => void;
  showAllTagsOption?: boolean;
  animate?: boolean;
  className?: string;
  onAnimationComplete?: () => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springBouncy,
  },
};

export default function Filter({
  tags,
  activeTag,
  onTagSelect,
  showAllTagsOption = false,
  animate = false,
  className = "",
  onAnimationComplete,
}: FilterProps) {
  if (!tags || tags.length === 0) return null;
  const tagPressMotion = pressScale();

  return (
    <motion.div
      className={["flex flex-wrap justify-center lg:justify-start gap-2", className]
        .filter(Boolean)
        .join(" ")}
      variants={containerVariants}
      initial="hidden"
      animate={animate ? "visible" : "hidden"}
      onAnimationComplete={(definition) => {
        if (definition === "visible") {
          onAnimationComplete?.();
        }
      }}
    >
      {showAllTagsOption && (
        <motion.button
          {...tagPressMotion}
          onClick={() => onTagSelect?.(null)}
          className={`px-4 py-2 rounded-full label-s transition-colors outline-none focus:outline-none focus-visible:outline-none ${
            activeTag === null
              ? "bg-[var(--background-inverse)] text-[var(--content-primary-inverse)]"
              : "bg-[var(--background-secondary)] text-[var(--content-secondary)] hover:bg-[var(--background-tertiary)]"
          }`}
        >
          All
        </motion.button>
      )}
      {tags.map((tag) => (
        <motion.button
          key={tag}
          {...tagPressMotion}
          onClick={() => onTagSelect?.(tag === activeTag ? null : tag)}
          className={`px-4 py-2 rounded-full label-s transition-colors outline-none focus:outline-none focus-visible:outline-none ${
            activeTag === tag
              ? "bg-[var(--background-inverse)] text-[var(--content-primary-inverse)]"
              : "bg-[var(--background-secondary)] text-[var(--content-secondary)] hover:bg-[var(--background-tertiary)]"
          }`}
        >
          {tag}
        </motion.button>
      ))}
    </motion.div>
  );
}
