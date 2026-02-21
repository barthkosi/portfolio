"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import Button from "@/components/interface/Button";
import SocialIcon from "@/components/interface/SocialIcon";
import ChevronDown from "@/components/interface/ChevronDown";
import { anim, physics } from "@/lib/transitions";
import { useLoading } from "@/context/LoadingContext";
import navData from "@/data/navigation.json";
import socialData from "@/data/social.json";

export default function Nav() {
    const [isOpen, setIsOpen] = useState(false);
    const [showVault, setShowVault] = useState(false);
    const [showSocial, setShowSocial] = useState(false);
    const pathname = usePathname();
    const { isContentReady } = useLoading();

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    useEffect(() => {
        let wasMobile = window.innerWidth < 768;

        const handleResize = () => {
            const isMobile = window.innerWidth < 768;

            if (wasMobile && !isMobile) {
                setIsOpen(false);
            }

            wasMobile = isMobile;
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <motion.nav
            className={`w-full flex flex-col ${isOpen ? 'h-screen' : 'h-[64px]'} md:h-[102px] p-4 md:p-8 items-start justify-between gap-6 sticky top-0 z-50 overflow-visible`}
            initial={anim.fadeDownBouncyBouncy.initial}
            animate={isContentReady ? anim.fadeDownBouncyBouncy.animate : anim.fadeDownBouncyBouncy.initial}
            exit={anim.fadeDownBouncyBouncy.exit}
        >
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: isOpen
                        ? 'var(--background-primary)'
                        : `linear-gradient(to bottom, var(--background-primary), var(--opacity-0))`,
                    maskImage: isOpen
                        ? 'none'
                        : 'linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0))',
                    WebkitMaskImage: isOpen
                        ? 'none'
                        : 'linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0))',
                    transition: 'all 0.3s ease',
                }}
            ></div>

            <div className="w-full relative flex flex-row justify-between items-center">
                <Link href="/" className="flex flex-row items-center gap-2 text-[var(--content-primary)] hover:text-[var(--content-secondary)]">
                    <Image
                        src="https://res.cloudinary.com/barthkosi/image/upload/pfp.webp"
                        alt="Barth logo"
                        width={38}
                        height={38}
                        className="rounded-[8px] object-cover"
                        priority
                    />
                    <div className="label-l">barth ✶</div>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex label-s flex-row gap-6 text-[var(--content-secondary)] items-center">
                    {navData.main.map((item) => (
                        <Link key={item.href} href={item.href} className="hover:text-[var(--content-primary)]">
                            {item.label}
                        </Link>
                    ))}

                    {/* Vault dropdown */}
                    <div
                        className="relative"
                        onMouseEnter={() => setShowVault(true)}
                        onMouseLeave={() => setShowVault(false)}
                    >
                        <button className="group py-2 items-center flex flex-row gap-1 hover:text-[var(--content-primary)] transition-colors">
                            Vault
                            <ChevronDown isOpen={showVault} />
                        </button>

                        <AnimatePresence>
                            {showVault && (
                                <motion.div
                                    className="absolute top-full left-1/2 -translate-x-1/2 mt-0 bg-[var(--background-primary)] text-[var(--content-primary)] border border-[var(--background-secondary)] rounded-xl shadow-lg p-3 flex flex-col gap-0"
                                    initial={anim.fadeDownBouncyBouncy.initial}
                                    animate={anim.fadeDownBouncyBouncy.animate}
                                    exit={anim.fadeDownBouncyBouncy.exit}
                                >
                                    {navData.vault.map((item) => (
                                        <Link key={item.href} href={item.href} className="hover:text-[var(--content-secondary)] whitespace-nowrap py-1">
                                            {item.label}
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Social dropdown */}
                    <div
                        className="relative"
                        onMouseEnter={() => setShowSocial(true)}
                        onMouseLeave={() => setShowSocial(false)}
                    >
                        <button className="group py-2 items-center flex flex-row gap-1 hover:text-[var(--content-primary)] transition-colors">
                            Social
                            <ChevronDown isOpen={showSocial} />
                        </button>

                        <AnimatePresence>
                            {showSocial && (
                                <motion.div
                                    className="absolute top-full left-1/2 -translate-x-1/2 mt-0 bg-[var(--background-primary)] text-[var(--content-primary)] border border-[var(--background-secondary)] rounded-xl shadow-lg p-3 flex flex-col gap-0"
                                    initial={anim.fadeDownBouncy.initial}
                                    animate={anim.fadeDownBouncy.animate}
                                    exit={anim.fadeDownBouncy.exit}
                                >
                                    {socialData.map((item) => (
                                        <a
                                            key={item.href}
                                            href={item.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex flex-row gap-2 items-center hover:text-[var(--content-secondary)] py-1 whitespace-nowrap"
                                        >
                                            {item.label}
                                        </a>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <Button
                        variant="secondary"
                        size="sm"
                        href="https://cal.com/barthkosi/intro"
                        openInNewTab
                    >
                        Contact Me
                    </Button>
                </div>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="md:hidden w-[38px] h-[38px] cursor-pointer flex items-center justify-center"
                    aria-label={isOpen ? "Close menu" : "Open menu"}
                >
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 32 32"
                        fill="none"
                    >
                        <motion.path
                            d={isOpen ? "M8 8L25 25" : "M4 10L28 10"}
                            stroke="var(--content-primary)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            fill="none"
                            initial={false}
                            animate={{
                                d: isOpen ? "M8 8L25 25" : "M4 10L28 10"
                            }}
                            transition={physics.bouncy}
                        />
                        <motion.path
                            d={isOpen ? "M8 25L25 8" : "M4 22L28 22"}
                            stroke="var(--content-primary)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            fill="none"
                            initial={false}
                            animate={{
                                d: isOpen ? "M8 25L25 8" : "M4 22L28 22"
                            }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        />
                    </svg>
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="md:hidden absolute top-[64px] left-0 w-full h-screen px-4 py-4 h4 flex flex-col gap-3 text-[var(--content-primary)]"
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: {
                                    staggerChildren: 0.08,
                                    delayChildren: 0.1,
                                },
                            },
                        }}
                    >
                        {/* Main links */}
                        <div className="flex flex-col gap-1">
                            {navData.main.map((item) => (
                                <motion.div
                                    key={item.href}
                                    className="flex flex-col gap-1"
                                    variants={{
                                        hidden: anim.fadeDownBouncyBouncy.hidden,
                                        visible: anim.fadeDownBouncyBouncy.visible,
                                    }}
                                >
                                    <Link href={item.href} onClick={() => setIsOpen(false)}>{item.label}</Link>
                                </motion.div>
                            ))}
                        </div>

                        {/* Vault links */}
                        <div className="flex flex-col gap-1">
                            <motion.div
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: { opacity: 1, transition: { ...physics.standard, delay: 1.6 } },
                                }}
                            >
                                <div className="label-s text-[var(--content-tertiary)]">Vault</div>
                            </motion.div>
                            {navData.vault.map((item) => (
                                <motion.div
                                    key={item.href}
                                    variants={{
                                        hidden: anim.fadeDownBouncyBouncy.hidden,
                                        visible: anim.fadeDownBouncyBouncy.visible,
                                    }}
                                >
                                    <Link href={item.href} onClick={() => setIsOpen(false)}>{item.label}</Link>
                                </motion.div>
                            ))}
                        </div>

                        {/* Social links */}
                        <div className="flex flex-col gap-1">
                            <motion.div
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: { opacity: 1, transition: { ...physics.standard, delay: 1.6 } },
                                }}
                            >
                                <div className="label-s text-[var(--content-tertiary)]">Social</div>
                            </motion.div>
                            {socialData.map((item) => (
                                <motion.div
                                    key={item.href}
                                    variants={{
                                        hidden: anim.fadeDownBouncyBouncy.hidden,
                                        visible: anim.fadeDownBouncyBouncy.visible,
                                    }}
                                >
                                    <a href={item.href} target="_blank" rel="noopener noreferrer">
                                        {item.label}
                                    </a>
                                </motion.div>
                            ))}
                        </div>

                        <motion.div
                            className="w-full"
                            variants={{
                                hidden: { opacity: 0, scaleX: 0, originX: 0 },
                                visible: {
                                    opacity: 1,
                                    scaleX: 1,
                                    originX: 0,
                                    transition: physics.bouncy
                                },
                            }}
                        >
                            <Button
                                className="flex w-full"
                                size="lg"
                                href="https://cal.com/barthkosi/intro"
                                openInNewTab
                            >
                                Contact Me
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
}
