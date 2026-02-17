import { motion } from "motion/react";
import { anim, stagger } from "@/lib/transitions";
import Button from "@/components/interface/Button";

const services = [
    {
        title: "Retainer / Advisory",
        description: "Ongoing design & technical direction for teams that need consistent quality and strategic growth.",
        scope: "Recurring monthly",
        outcome: "Consistent growth"
    },
    {
        title: "Project-Based",
        description: "Defined scope for high-impact launches, redesigns, or MVP development.",
        scope: "4-8 weeks",
        outcome: "High-impact launch"
    },
    {
        title: "Hourly / Sprint",
        description: "Specific features, fixes, or polishes executed with rapid velocity.",
        scope: "Flexible",
        outcome: "Rapid execution"
    },
];

export function ServicesSection() {
    return (
        <section className="w-full flex flex-col items-center px-4 md:px-8 lg:px-20 py-8 md:py-12">
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-20%" }}
                variants={stagger(0.1)}
                className="w-full max-w-[1440px] flex flex-col gap-16 md:gap-24"
            >
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <motion.h2 variants={anim.fadeUp} className="h3 text-[var(--content-primary)]">
                        Ways We Can <br className="hidden md:block" /> Work Together
                    </motion.h2>
                    <motion.div variants={anim.fadeUp}>
                        <Button href="https://cal.com/barthkosi/intro" openInNewTab>
                            Discuss a Project
                        </Button>
                    </motion.div>
                </div>

                <motion.div
                    variants={stagger(0.2)}
                    className="flex flex-col"
                >
                    {services.map((service, index) => (
                        <motion.div
                            key={index}
                            variants={anim.fadeUp}
                            className="group flex flex-col md:flex-row gap-6 md:gap-12 py-8 border-t border-[var(--border-secondary)] transition-colors hover:bg-[var(--background-secondary)] px-4 -mx-4 rounded-lg"
                        >
                            <div className="md:w-1/3">
                                <h3 className="h5 text-[var(--content-primary)] group-hover:text-[var(--content-primary)] transition-colors">
                                    {service.title}
                                </h3>
                            </div>

                            <div className="md:w-1/3">
                                <p className="body-l text-[var(--content-secondary)]">
                                    {service.description}
                                </p>
                            </div>

                            <div className="md:w-1/3 flex flex-row gap-8 items-start justify-start md:justify-end">
                                <div className="w-full flex flex-col gap-1">
                                    <span className="w-full label-s text-[var(--content-tertiary)] uppercase tracking-wider">Scope</span>
                                    <span className="w-full body-m text-[var(--content-primary)]">{service.scope}</span>
                                </div>
                                <div className="w-full flex flex-col gap-1">
                                    <span className="w-full label-s text-[var(--content-tertiary)] uppercase tracking-wider">Outcome</span>
                                    <span className="w-full body-m text-[var(--content-primary)]">{service.outcome}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    <motion.div variants={anim.fadeUp} className="w-full h-px bg-[var(--border-secondary)]" />
                </motion.div>
            </motion.div>
        </section>
    );
}
