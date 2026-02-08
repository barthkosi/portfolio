import { motion } from "motion/react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { Motion, stagger } from "@/lib/transitions";
import { fadeUpVariant, inViewConfig } from "@/lib/homeAnimations";
import explorationsData from "@/data/explorations.json";

export function ExplorationsSection() {
    return (
        <section className="flex flex-col items-center px-4 md:px-8 lg:px-20 py-8 md:py-12 gap-8">
            <motion.div
                className="flex flex-col gap-2 max-w-[640px] text-center"
                initial="hidden"
                whileInView="visible"
                viewport={inViewConfig}
                variants={stagger(0.1)}
            >
                <motion.div variants={fadeUpVariant}>
                    <h3>Explorations</h3>
                </motion.div>
                <motion.div variants={fadeUpVariant}>
                    <p className="text-[var(--content-secondary)]">Experiments, tests, and unfinished ideas.</p>
                </motion.div>
            </motion.div>

            <motion.div
                className="w-full flex flex-col md:flex-row gap-5"
                initial="hidden"
                whileInView="visible"
                viewport={inViewConfig}
                variants={stagger(0.1)}
            >
                {explorationsData.map((item) => (
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
                            variant="list-stacked"
                        />
                    </motion.div>
                ))}
            </motion.div>

            <Motion
                type="FadeUpBouncy"
                useInView={true}
                viewport={inViewConfig}
                className="w-fit"
            >
                <Button to="/explorations" variant="secondary">
                    See More
                </Button>
            </Motion>
        </section>
    );
}
