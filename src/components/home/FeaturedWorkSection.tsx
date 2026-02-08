import { motion } from "motion/react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { Motion, stagger } from "@/lib/transitions";
import { fadeUpVariant, inViewConfig } from "@/lib/homeAnimations";
import featuredWork from "@/data/featuredWork.json";

export function FeaturedWorkSection() {
    const row1 = featuredWork.filter(item => item.row === 1);
    const row2 = featuredWork.filter(item => item.row === 2);

    return (
        <section className="flex flex-col items-center px-4 md:px-8 lg:px-20 py-8 md:py-12 pt-20 gap-8">
            <motion.div
                className="flex flex-col gap-4 w-full text-start"
                initial="hidden"
                whileInView="visible"
                viewport={inViewConfig}
                variants={stagger(0.1)}
            >
                <motion.div variants={fadeUpVariant}>
                    <h2 className="h4">Featured Work</h2>
                </motion.div>
            </motion.div>

            <div className="flex flex-col gap-4 md:gap-6">
                {/* First row */}
                <motion.div
                    className="flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-6"
                    initial="hidden"
                    whileInView="visible"
                    viewport={inViewConfig}
                    variants={stagger(0.1)}
                >
                    {row1.map((item) => (
                        <motion.div
                            key={item.id}
                            className={item.colSpan === 2 ? "col-span-2" : "col-span-1"}
                            variants={fadeUpVariant}
                        >
                            <Card
                                image={item.image}
                                title={item.title}
                                description={item.description}
                                link={item.link}
                                tags={item.tags}
                                aspectRatio={item.aspectRatio as "16:9" | "2:3" | "auto" | undefined}
                                variant="list-stacked"
                            />
                        </motion.div>
                    ))}
                </motion.div>

                {/* Second row */}
                <motion.div
                    className="flex flex-col md:flex-row gap-4 md:gap-6"
                    initial="hidden"
                    whileInView="visible"
                    viewport={inViewConfig}
                    variants={stagger(0.1)}
                >
                    {row2.map((item) => (
                        <motion.div
                            key={item.id}
                            className="w-full"
                            variants={fadeUpVariant}
                        >
                            <Card
                                image={item.image}
                                title={item.title}
                                description={item.description}
                                link={item.link}
                                tags={item.tags}
                                aspectRatio={item.aspectRatio as "16:9" | "2:3" | "auto" | undefined}
                                variant="list-stacked"
                            />
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            <Motion
                type="FadeUpBouncy"
                useInView={true}
                viewport={inViewConfig}
                className="w-fit"
            >
                <Button to="/work" variant="secondary">View All Work</Button>
            </Motion>
        </section>
    );
}
