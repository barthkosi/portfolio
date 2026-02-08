"use client";

import { motion } from "motion/react";
import Button from "@/components/interface/Button";
import Card from "@/components/interface/Card";
import { Motion, AnimatedSection, fadeUpVariant, stagger, inViewConfig } from "@/lib/transitions";
import writingData from "@/data/writing.json";

export default function WritingSection() {
    return (
        <section className="overflow-visible flex flex-col lg:flex-row items-center gap-8 px-4 md:px-8 lg:px-20 py-8 md:py-12">
            <AnimatedSection
                className="w-full max-w-[400px] flex flex-col gap-2 items-center lg:items-start text-center lg:text-left lg:top-[134px] sticky self-start mx-auto"
            >
                <motion.div className="w-full" variants={fadeUpVariant}>
                    <h3>Writing</h3>
                </motion.div>
                <motion.div className="w-full" variants={fadeUpVariant}>
                    <p className="text-[var(--content-secondary)]">I write about tech, design and the messy human condition.</p>
                </motion.div>
                <motion.div className="hidden lg:block" variants={fadeUpVariant}>
                    <Button to="/writing" variant="secondary">
                        See Writing
                    </Button>
                </motion.div>
            </AnimatedSection>

            <motion.div
                className="w-full flex flex-col gap-5 lg:gap-20"
                initial="hidden"
                whileInView="visible"
                viewport={inViewConfig}
                variants={stagger(0.15)}
            >
                {writingData.map((item, index) => (
                    <motion.div
                        key={item.id}
                        className={index === 0 ? "lg:top-[134px] lg:sticky self-start" : "lg:top-[134px] sticky self-start"}
                        variants={fadeUpVariant}
                    >
                        <Card
                            image={item.image}
                            title={item.title}
                            description={item.description}
                            link={item.link}
                            variant="list-stacked"
                        />
                    </motion.div>
                ))}
            </motion.div>

            <Motion
                type="FadeUpBouncy"
                useInView={true}
                viewport={inViewConfig}
                className="w-fit lg:hidden"
            >
                <Button to="/writing" variant="secondary">
                    See Writing
                </Button>
            </Motion>
        </section>
    );
}
