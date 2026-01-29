"use client";

import { useState, useEffect } from "react";
import { motion, Variants } from "motion/react";
import InfoBlock from "@/components/InfoBlock";
import Card from "@/components/Card";
import Filter from "@/components/Filter";
import { ContentItem } from "@/lib/content";
import { Motion, springBouncy } from "@/lib/transitions";

interface WorkContentProps {
    initialProjects: ContentItem[];
    allTags: string[];
}

export default function WorkContent({ initialProjects, allTags }: WorkContentProps) {
    const [projects] = useState<ContentItem[]>(initialProjects);
    const [filteredProjects, setFilteredProjects] = useState<ContentItem[]>(initialProjects);
    const [tags] = useState<string[]>(allTags);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [introFinished, setIntroFinished] = useState(false);
    const [showCards, setShowCards] = useState(false);

    useEffect(() => {
        if (activeTag) {
            setFilteredProjects(projects.filter(p => p.tags?.includes(activeTag)));
        } else {
            setFilteredProjects(projects);
        }
    }, [activeTag, projects]);

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2 },
        },
    };

    const cardVariants: Variants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: springBouncy
        },
    };

    return (
        <>
            <InfoBlock
                title="Work"
                number={projects.length}
                description="These entries document my process of building and refining tools that serve a purpose."
                onComplete={() => setIntroFinished(true)}
            />

            <div className="w-full flex flex-col">
                <Filter
                    tags={tags}
                    activeTag={activeTag}
                    onTagSelect={setActiveTag}
                    animate={introFinished}
                    onAnimationComplete={() => setShowCards(true)}
                />

                {projects.length > 0 && (
                    <motion.div
                        className="w-full flex flex-col gap-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate={introFinished && showCards ? "visible" : "hidden"}
                    >
                        {Object.entries(
                            filteredProjects.reduce((acc, project) => {
                                const year = project.date ? `${project.date.substring(2, 4)}'` : "Unknown";
                                if (!acc[year]) acc[year] = [];
                                acc[year].push(project);
                                return acc;
                            }, {} as Record<string, typeof projects>)
                        )
                            .sort((a, b) => b[0].localeCompare(a[0])) // Sort years descending
                            .map(([year, yearProjects]) => (
                                <div key={year} className="w-full flex flex-col md:flex-row gap-4 relative">
                                    {/* Desktop Year Label */}
                                    <div className="md:w-[0px] shrink-0 z-[2]">
                                        <span className="h3 text-[var(--content-primary)] sticky top-[134px] hidden md:block">
                                            {year}
                                        </span>
                                    </div>

                                    <div className="w-full flex flex-col gap-4">
                                        {/* Mobile Year Label */}
                                        <div className="md:hidden pb-2 select-none">
                                            <span className="h3 text-[var(--content-primary)]">{year}</span>
                                        </div>

                                        {yearProjects.map((project) => (
                                            <motion.div key={project.slug} variants={cardVariants}>
                                                <Card
                                                    image={project.coverImage || ""}
                                                    title={project.title}
                                                    description={project.description}
                                                    link={`/work/${project.slug}`}
                                                    tags={project.tags}
                                                    variant="list"
                                                    aspectRatio="aspect-video"
                                                />
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                    </motion.div>
                )}

                {projects.length === 0 && (
                    <Motion
                        type="fadeUpBouncy"
                        className="flex flex-col my-auto items-center w-full gap-7"
                        initial="initial"
                        animate={introFinished ? "animate" : "initial"}
                    >
                        <h5 className="my-auto h-full text-[var(--content-primary)]">Work is coming soon!</h5>
                    </Motion>
                )}
            </div>
        </>
    );
}
