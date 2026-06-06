"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import Button from "@/components/interface/Button";
import ChevronDown from "@/components/interface/ChevronDown";
import { anim, physics, pressScale } from "@/lib/transitions";
import navData from "@/data/navigation.json";
import socialData from "@/data/social-links.json";

export default function Nav() {
    const pathname = usePathname();
    const [menuState, setMenuState] = useState({ isOpen: false, path: pathname });
    const [showVault, setShowVault] = useState(false);
    const [showSocial, setShowSocial] = useState(false);
    const isOpen = menuState.isOpen && menuState.path === pathname;
    const navLinkPressMotion = pressScale({ hover: 1.02, tap: 0.98 });
    const navBrandPressMotion = pressScale({ hover: 1.02, tap: 0.98 });

    useEffect(() => {
        let wasMobile = window.innerWidth < 768;

        const handleResize = () => {
            const isMobile = window.innerWidth < 768;

            if (wasMobile && !isMobile) {
                setMenuState({ isOpen: false, path: pathname });
            }

            wasMobile = isMobile;
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [pathname]);

    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "unset";

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const closeMenu = () => setMenuState({ isOpen: false, path: pathname });
    const toggleMenu = () =>
        setMenuState((current) => ({
            isOpen: !(current.isOpen && current.path === pathname),
            path: pathname,
        }));

    return (
        <motion.nav
            className={`w-full flex flex-col ${isOpen ? "h-screen" : "h-[64px]"} md:h-[102px] p-4 md:p-8 items-start justify-between gap-6 sticky top-0 z-50 overflow-visible`}
            initial={anim.fadeDown.initial}
            animate={anim.fadeDown.animate}
            exit={anim.fadeDown.exit}
        >
            {/* Fading background cap — hidden when menu is open */}
            {!isOpen && (
                <div className="absolute inset-0 -z-10 pointer-events-none">
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background: "linear-gradient(to bottom, var(--background-primary) 1%, transparent 100%)",
                        }}
                    />
                </div>
            )}

            {/* Solid background when mobile menu is open */}
            {isOpen && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "var(--background-primary)", transition: "all 0.3s ease" }}
                />
            )}

            <div className="w-full relative flex flex-row justify-between items-center">
                <motion.div {...navBrandPressMotion} className="origin-left">
                    <Link
                        href="/"
                        className="flex flex-row items-center gap-2 text-[var(--content-primary)] hover:text-[var(--content-secondary)]"
                    >
                        <Image
                            src="https://res.cloudinary.com/barthkosi/image/upload/pfp.avif"
                            alt="Barth logo"
                            width={38}
                            height={38}
                            className="rounded-[8px] object-cover"
                            priority
                        />
                        <div className="label-l">barth</div>
                    </Link>
                </motion.div>

                <div className="hidden md:flex label-s flex-row gap-6 text-[var(--content-primary)] items-center">
                    {navData.main.map((item) => (
                        <motion.div key={item.href} {...navLinkPressMotion} className="inline-flex">
                            <Link href={item.href} className="hover:text-[var(--content-secondary)]">
                                {item.label}
                            </Link>
                        </motion.div>
                    ))}

                    <div
                        className="relative"
                        onMouseEnter={() => setShowVault(true)}
                        onMouseLeave={() => setShowVault(false)}
                    >
                        <button className="group py-2 items-center flex flex-row gap-1 hover:text-[var(--content-secondary)] transition-colors">
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
                                        <motion.div key={item.href} {...navLinkPressMotion} className="inline-flex w-full">
                                            <Link
                                                href={item.href}
                                                className="hover:text-[var(--content-secondary)] whitespace-nowrap py-1"
                                            >
                                                {item.label}
                                            </Link>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div
                        className="relative"
                        onMouseEnter={() => setShowSocial(true)}
                        onMouseLeave={() => setShowSocial(false)}
                    >
                        <button className="group py-2 items-center flex flex-row gap-1 hover:text-[var(--content-secondary)] transition-colors">
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
                                        <motion.a
                                            key={item.href}
                                            {...navLinkPressMotion}
                                            href={item.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex flex-row gap-2 items-center hover:text-[var(--content-secondary)] py-1 whitespace-nowrap"
                                        >
                                            {item.label}
                                        </motion.a>
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
                    onClick={toggleMenu}
                    className="md:hidden w-[38px] h-[38px] cursor-pointer flex items-center justify-center"
                    aria-label={isOpen ? "Close menu" : "Open menu"}
                >
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <motion.path
                            d={isOpen ? "M8 8L25 25" : "M4 10L28 10"}
                            stroke="var(--content-primary)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            fill="none"
                            initial={false}
                            animate={{
                                d: isOpen ? "M8 8L25 25" : "M4 10L28 10",
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
                                d: isOpen ? "M8 25L25 8" : "M4 22L28 22",
                            }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        />
                    </svg>
                </button>
            </div>

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
                        <div className="flex flex-col gap-1">
                            {navData.main.map((item) => (
                                <motion.div
                                    key={item.href}
                                    variants={{
                                        hidden: anim.fadeDownBouncyBouncy.hidden,
                                        visible: anim.fadeDownBouncyBouncy.visible,
                                    }}
                                >
                                    <motion.div {...navLinkPressMotion} className="inline-flex">
                                        <Link
                                            href={item.href}
                                            onClick={closeMenu}                                          
                                        >
                                            {item.label}
                                        </Link>
                                    </motion.div>
                                </motion.div>
                            ))}
                        </div>

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
                                    <motion.div {...navLinkPressMotion} className="inline-flex">
                                        <Link href={item.href} onClick={closeMenu}>
                                            {item.label}
                                        </Link>
                                    </motion.div>
                                </motion.div>
                            ))}
                        </div>

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
                                    <motion.a
                                        {...navLinkPressMotion}
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex"
                                    >
                                        {item.label}
                                    </motion.a>
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
                                    transition: physics.bouncy,
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
