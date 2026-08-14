"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "motion/react";
import InfoBlock from "@/components/interface/InfoBlock";
import Card from "@/components/interface/Card";
import Filter from "@/components/interface/Filter";
import type { ContentItem } from "@/lib/content";
import { Motion, springBouncy, physics } from "@/lib/transitions";

export type ContentTypeOption = {
  label: string;
  value: string;
};

function extractTags(items: ContentItem[]): string[] {
  const tags = new Set<string>();
  items.forEach((item) => {
    item.tags?.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}

interface ContentIndexProps {
  title: string;
  description: string;
  emptyMessage: string;
  items: ContentItem[];
  allTags: string[];
  initialType?: string;
  typeOptions?: ContentTypeOption[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.08,
      staggerChildren: 0.08,
    },
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

const defaultTypeOptions: ContentTypeOption[] = [
  { label: "Work", value: "work" },
  { label: "Explorations", value: "explorations" },
];

function getYearLabel(date: string) {
  return date ? `${date.substring(2, 4)}'` : "Unknown";
}

export default function ContentIndex({
  title,
  description,
  emptyMessage,
  items,
  initialType = "work",
  typeOptions,
}: ContentIndexProps) {
  const types = typeOptions ?? defaultTypeOptions;
  const [activeType, setActiveType] = useState<string>(initialType);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [introFinished, setIntroFinished] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [filterAnimationKey, setFilterAnimationKey] = useState(0);

  const availableTags = useMemo(() => {
    const typeItems =
      activeType === "all"
        ? items
        : items.filter((item) => item.type === activeType);
    return extractTags(typeItems);
  }, [activeType, items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType =
        activeType === "all" || item.type === activeType;
      const matchesTag = !activeTag || item.tags?.includes(activeTag);
      return matchesType && matchesTag;
    });
  }, [activeType, activeTag, items]);

  const itemsByYear = useMemo(
    () =>
      Object.entries(
        filteredItems.reduce<Record<string, ContentItem[]>>((groups, item) => {
          const year = getYearLabel(item.date);
          groups[year] ??= [];
          groups[year].push(item);
          return groups;
        }, {}),
      ).sort((a, b) => b[0].localeCompare(a[0])),
    [filteredItems],
  );

  const handleTypeSelect = useCallback((type: string) => {
    setActiveType(type);
    setActiveTag(null);
    setFilterAnimationKey((currentKey) => currentKey + 1);
  }, []);

  const handleTagSelect = useCallback((tag: string | null) => {
    setActiveTag(tag);
    setFilterAnimationKey((currentKey) => currentKey + 1);
  }, []);

  useEffect(() => {
    if (!activeTag) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        handleTagSelect(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTag, handleTagSelect]);

  return (
    <section className="flex flex-col lg:flex-row w-full gap-6 lg:gap-8 h-auto lg:justify-left lg:row justify-center">
      <div className="flex flex-col gap-6 lg:gap-8 items-center lg:items-start lg:sticky lg:top-[134px] lg:self-start w-full lg:w-auto lg:max-w-[340px] shrink-0">
        <InfoBlock
          title={title}
          number={filteredItems.length}
          description={description}
          onComplete={() => {
            setIntroFinished(true);
            setShowCards(true);
          }}
        >
          {types.length > 0 && (
            <nav className="flex flex-row lg:flex-col w-auto lg:w-full lg:max-w-[280px] gap-2 sm:gap-4 lg:gap-1.5 justify-center lg:justify-start">
              {types.map((type) => {
                const isActive = activeType === type.value;
                const count =
                  type.value === "all"
                    ? items.length
                    : items.filter((item) => item.type === type.value).length;

                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeSelect(type.value)}
                    className={`relative flex items-center justify-between gap-4 w-auto lg:w-full py-2.5 px-3 text-left transition-colors outline-none focus:outline-none focus-visible:outline-none ${
                      isActive
                        ? "text-[var(--content-primary)] font-semibold"
                        : "group text-[var(--content-secondary)] hover:text-[var(--content-primary)] hover:bg-[var(--background-secondary)]/50 font-normal"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="activeContentTypeIndicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px] lg:top-1.5 lg:bottom-1.5 lg:left-0 lg:w-[3px] lg:h-auto lg:right-auto rounded-full bg-[var(--content-primary)]"
                        transition={physics.snappy}
                      />
                    )}
                    <span className="label-m capitalize">{type.label}</span>
                    <span
                      className={`label-m tabular-nums ${
                        isActive
                          ? "text-[var(--content-primary)] font-medium"
                          : "text-[var(--content-tertiary)] group-hover:text-[var(--content-secondary)]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}
        </InfoBlock>
      </div>

      <div className="w-full items-center lg:items-start flex flex-col">
        {availableTags.length > 0 && (
          <Filter
            tags={availableTags}
            activeTag={activeTag}
            onTagSelect={handleTagSelect}
            animate={introFinished}
            className="mb-8"
          />
        )}

        {filteredItems.length > 0 ? (
          <motion.div
            key={filterAnimationKey}
            className="w-full flex flex-col gap-4"
            variants={containerVariants}
            initial="hidden"
            animate={introFinished && showCards ? "visible" : "hidden"}
          >
            {itemsByYear.map(([year, yearItems]) => (
              <section
                key={year}
                className="w-full flex flex-row gap-4 relative"
              >
                <div className="w-[0px] shrink-0 relative z-20 pointer-events-none">
                  <h2 className="h3 text-[var(--content-primary)] [text-shadow:5px_5px_0px_var(--border-primary)] sticky top-[64px] md:top-[134px] block relative z-20">
                    {year}
                  </h2>
                </div>

                <ul className="w-full flex flex-col gap-4 relative z-0">
                  {yearItems.map((item) => (
                    <motion.li
                      key={`${filterAnimationKey}-${item.slug}`}
                      variants={cardVariants}
                    >
                      <Card
                        image={item.coverImage || ""}
                        bannerImage={item.bannerImage}
                        title={item.title}
                        description={item.description}
                        link={`/${item.type}/${item.slug}`}
                        tags={item.tags}
                        variant="list"
                        aspectRatio="aspect-video"
                        locked={item.locked}
                      />
                    </motion.li>
                  ))}
                </ul>
              </section>
            ))}
          </motion.div>
        ) : (
          <Motion
            type="fadeUpBouncy"
            className="flex flex-col my-auto items-center w-full gap-7"
            initial="initial"
            animate={introFinished ? "animate" : "initial"}
          >
            <p className="h5 my-auto h-full text-[var(--content-primary)]">
              {emptyMessage}
            </p>
          </Motion>
        )}
      </div>
    </section>
  );
}
