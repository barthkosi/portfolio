import { motion } from "motion/react";
import { anim, stagger } from "@/lib/transitions";
import Button from "@/components/interface/Button";

export function FinalCTASection() {
    return (
        <section className="w-full flex flex-col items-center px-4 md:px-8 lg:px-20 py-24 md:py-32">
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-20%" }}
                variants={stagger(0.2)}
                className="flex flex-col items-center text-center gap-8 max-w-2xl"
            >
                <div className="overflow-hidden">
                    <motion.h2
                        variants={anim.fadeUp}
                        className="h3 text-[var(--content-primary)]"
                    >
                        Have a product or idea worth pushing further?
                    </motion.h2>
                </div>

                <motion.div variants={anim.fadeUp}>
                    <Button size="lg" href="https://cal.com/barthkosi/intro" openInNewTab>
                        Start a Conversation
                    </Button>
                </motion.div>
            </motion.div>
        </section>
    );
}
