import { motion } from "motion/react";
import { anim, stagger } from "@/lib/transitions";

const principles = [
    "Build systems before polish.",
    "Motion communicates state.",
    "Constraints create clarity.",
    "Ship early. Refine deliberately.",
];

export function HowIOperateSection() {
    return (
        <section className="w-full flex flex-col items-center px-4 md:px-8 lg:px-20 py-8 md:py-12">
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-20%" }}
                variants={stagger(0.4)}
                className="w-full max-w-[1440px] grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8"
            >
                <motion.div variants={anim.fadeUp} className="md:col-span-4 lg:col-span-3">
                    <h2 className="h3 text-[var(--content-primary)]">
                        How I Operate
                    </h2>
                </motion.div>

                <motion.div
                    variants={stagger(0.2)}
                    className="md:col-span-8 lg:col-span-8 lg:col-start-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12"
                >
                    {principles.map((principle, index) => (
                        <motion.div
                            key={index}
                            variants={anim.fadeUp}
                            className="flex flex-col gap-4 border-l border-[var(--border-secondary)] pl-6"
                        >
                            <span className="label-m text-[var(--content-tertiary)]">
                                {(index + 1).toString().padStart(2, '0')}
                            </span>
                            <p className="h5 text-[var(--content-primary)]">
                                {principle}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>
        </section>
    );
}
