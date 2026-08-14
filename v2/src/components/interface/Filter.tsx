"use client";

import { pressScale, springBouncy } from "@/lib/transitions";
import { motion, Variants } from "motion/react";

export type FilterTypeOption = {
  label: string;
  value: string;
};

interface FilterProps {
  types?: FilterTypeOption[];
  activeType?: string;
  onTypeSelect?: (type: string) => void;
  tags: string[];
  activeTag: string | null;
  onTagSelect: (tag: string | null) => void;
  animate?: boolean;
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
  types,
  activeType,
  onTypeSelect,
  tags,
  activeTag,
  onTagSelect,
  animate = false,
  onAnimationComplete,
}: FilterProps) {
  const hasTypes = types && types.length > 0;
  const hasTags = tags.length > 0;

  if (!hasTypes && !hasTags) return null;
  const tagPressMotion = pressScale();

  return (
    <motion.div
      className="flex flex-col max-w-[680px] w-full items-center lg:items-start gap-4 mb-8"
      variants={containerVariants}
      initial="hidden"
      animate={animate ? "visible" : "hidden"}
      onAnimationComplete={(definition) => {
        if (definition === "visible") {
          onAnimationComplete?.();
        }
      }}
    >
      {hasTypes && (
        <div className="flex flex-wrap justify-center lg:justify-start gap-2">
          {types.map((type) => (
            <motion.button
              key={type.value}
              {...tagPressMotion}
              onClick={() => onTypeSelect?.(type.value)}
              className={`px-4 py-2 rounded-full label-s transition-colors capitalize ${
                activeType === type.value
                  ? "bg-[var(--background-inverse)] text-[var(--content-primary-inverse)]"
                  : "bg-[var(--background-secondary)] text-[var(--content-secondary)] hover:bg-[var(--background-tertiary)]"
              }`}
            >
              {type.label}
            </motion.button>
          ))}
        </div>
      )}

      {hasTags && (
        <div className="flex flex-wrap justify-center lg:justify-start gap-2">
          <motion.button
            {...tagPressMotion}
            onClick={() => onTagSelect(null)}
            className={`px-3 py-1.5 rounded-full text-xs label-s transition-colors ${
              activeTag === null
                ? "bg-[var(--background-inverse)] text-[var(--content-primary-inverse)]"
                : "bg-[var(--background-secondary)] text-[var(--content-secondary)] hover:bg-[var(--background-tertiary)]"
            }`}
          >
            All Tags
          </motion.button>
          {tags.map((tag) => (
            <motion.button
              key={tag}
              {...tagPressMotion}
              onClick={() => onTagSelect(tag === activeTag ? null : tag)}
              className={`px-3 py-1.5 rounded-full text-xs label-s transition-colors ${
                activeTag === tag
                  ? "bg-[var(--background-inverse)] text-[var(--content-primary-inverse)]"
                  : "bg-[var(--background-secondary)] text-[var(--content-secondary)] hover:bg-[var(--background-tertiary)]"
              }`}
            >
              {tag}
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
