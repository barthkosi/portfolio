"use client";

import Image from "next/image";
import { motion, Variants } from "motion/react";
import Button from "@/components/interface/Button";
import Marquee from "react-fast-marquee";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { anim, fadeUpVariant, gradientMaskVertical, gradientMaskHorizontal } from "@/lib/transitions";
import heroMarquee from "@/data/home/heroMarquee.json";

const marqueeDesktopVariants: Variants = {
    hidden: anim.fadeRightBouncy.hidden,
    visible: {
        ...anim.fadeRightBouncy.visible,
        transition: { ...anim.fadeRightBouncy.visible.transition, delay: 1.4 },
    },
};

const marqueeMobileVariants: Variants = {
    hidden: anim.FadeUpBouncyBouncy.hidden,
    visible: {
        ...anim.FadeUpBouncyBouncy.visible,
        transition: { ...anim.FadeUpBouncyBouncy.visible.transition, delay: 1.4 },
    },
};

export default function HeroSection() {
    const isDesktop = useMediaQuery('(min-width: 1024px)');

    return (
        <section className="flex flex-col pl-4 md:pl-8 pr-4 md:pr-8 lg:pr-0 lg:flex-row lg:gap-8 items-center h-[calc(100vh-64px)] md:h-[calc(100vh-134px)]">
            {/* Hero Content */}
            <motion.div
                className="w-full items-start flex flex-col justify-center gap-4"
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: {},
                    visible: {
                        transition: {
                            staggerChildren: 0.15,
                            delayChildren: 0.8,
                        },
                    },
                }}
            >
                <motion.div
                    className="flex flex-col gap-2 pt-4 lg:pt-0 text-left"
                    variants={fadeUpVariant}
                >
                    <h1 className='md:max-w-[640px] lg:max-w-[1440px]'>
                        Barth creates visual systems and digital experiences
                    </h1>
                </motion.div>
                <motion.div variants={fadeUpVariant}>
                    <p className="body-m max-w-[380px] md:max-w-[640px] lg:max-w-[520px] text-[var(--content-secondary)]">
                        Explore my portfolio of web interactions, engineered solutions, and dynamic motion design that aims to inject joy into the digital world.
                    </p>
                </motion.div>

                <motion.div
                    className="flex flex-row items-center gap-3 flex-wrap"
                    variants={fadeUpVariant}
                >
                    <Button
                        href="https://cal.com/barthkosi/intro"
                        openInNewTab
                    >
                        Schedule a Call
                    </Button>
                    <Button to="/work" variant="secondary">
                        View Work
                    </Button>
                </motion.div>
            </motion.div>

            {/* Marquee Section */}
            <motion.div
                className="w-[140%] lg:w-[100%] flex justify-center items-start"
                initial="hidden"
                animate="visible"
                variants={isDesktop ? marqueeDesktopVariants : marqueeMobileVariants}
            >
                <div
                    className={`flex gap-1 ${isDesktop ? 'flex-row -mt-20' : 'flex-col'}`}
                    style={{
                        transform: 'perspective(500px) rotate(-4deg) rotateX(25deg) skewX(-16deg) skewY(6deg)',
                    }}
                >
                    {isDesktop ? (
                        <>
                            <div className="relative w-[280px] h-[600px] overflow-hidden" style={gradientMaskVertical}>
                                <div className="flex flex-col gap-1 animate-scroll-up">
                                    {[...heroMarquee.slice(0, 5), ...heroMarquee.slice(0, 5), ...heroMarquee.slice(0, 5)].map((item, index) => (
                                        <div key={`col1-${item.id}-${index}`} className="w-full flex-shrink-0">
                                            <Image src={item.image} alt={item.alt} width={280} height={158} className="w-full aspect-video object-cover rounded-[var(--radius-lg)]" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="relative w-[280px] h-[600px] overflow-hidden" style={gradientMaskVertical}>
                                <div className="flex flex-col gap-1 animate-scroll-down">
                                    {[...heroMarquee.slice(5), ...heroMarquee.slice(0, 3), ...heroMarquee.slice(5), ...heroMarquee.slice(0, 3), ...heroMarquee.slice(5), ...heroMarquee.slice(0, 3)].map((item, index) => (
                                        <div key={`col2-${item.id}-${index}`} className="w-full flex-shrink-0">
                                            <Image src={item.image} alt={item.alt} width={280} height={158} className="w-full aspect-video object-cover rounded-[var(--radius-lg)]" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <Marquee direction="left" speed={50} autoFill style={gradientMaskHorizontal}>
                                {heroMarquee.slice(0, 5).map((item) => (
                                    <Image key={item.id} src={item.image} alt={item.alt} width={320} height={180} className="h-40 md:h-52 w-auto aspect-video object-cover rounded-[var(--radius-lg)] gap-[2px] mx-[1px]" />
                                ))}
                            </Marquee>
                            <Marquee direction="right" speed={50} autoFill style={gradientMaskHorizontal}>
                                {heroMarquee.slice(5).map((item) => (
                                    <Image key={item.id} src={item.image} alt={item.alt} width={320} height={180} className="h-40 md:h-52 w-auto aspect-video object-cover rounded-[var(--radius-lg)] gap-[2px] mx-[1px]" />
                                ))}
                            </Marquee>
                        </>
                    )}
                </div>
            </motion.div>
        </section>
    );
}
