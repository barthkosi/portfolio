"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { pressScale } from "@/lib/transitions";
import { cn } from "@/lib/utils";

// --- Constants & Types ---
const MENU_WIDTH = 220;
const VERTICAL_THRESHOLD = 350;
const HORIZONTAL_THRESHOLD = 200;

type MenuType = "default" | "card" | "image";

interface ContextMenuData {
    link?: string;
    title?: string;
    src?: string;
}

interface MenuPos {
    x: number;
    y: number;
    alignX: 'left' | 'right';
    alignY: 'top' | 'bottom';
}

// --- Custom Hook: State & Events ---
function useContextMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [pos, setPos] = useState<MenuPos>({ x: 0, y: 0, alignX: 'left', alignY: 'top' });
    const [type, setType] = useState<MenuType>("default");
    const [data, setData] = useState<ContextMenuData>({});

    const closeMenu = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            
            const target = e.target as HTMLElement;
            const card = target.closest('[data-context="card"]');
            const media = target.closest('img, video') as HTMLImageElement | HTMLVideoElement;

            let menuType: MenuType = "default";
            let menuData: ContextMenuData = {};

            if (card) {
                menuType = "card";
                menuData = {
                    link: card.getAttribute('data-card-link') || undefined,
                    title: card.getAttribute('data-card-title') || undefined,
                };
            } else if (media) {
                menuType = "image";
                menuData = { src: media.src };
            }

            const x = e.clientX;
            const y = e.clientY;
            
            setPos({
                x, y,
                alignX: x + MENU_WIDTH + HORIZONTAL_THRESHOLD > window.innerWidth ? 'right' : 'left',
                alignY: y + VERTICAL_THRESHOLD > window.innerHeight ? 'bottom' : 'top'
            });
            setType(menuType);
            setData(menuData);
            setIsOpen(true);
        };

        window.addEventListener("contextmenu", handleContextMenu);
        window.addEventListener("click", closeMenu);
        window.addEventListener("scroll", closeMenu, true);

        return () => {
            window.removeEventListener("contextmenu", handleContextMenu);
            window.removeEventListener("click", closeMenu);
            window.removeEventListener("scroll", closeMenu, true);
        };
    }, [closeMenu]);

    // Global cursor management
    useEffect(() => {
        document.body.classList.toggle('force-pointer-cursor', isOpen);
        return () => document.body.classList.remove('force-pointer-cursor');
    }, [isOpen]);

    return { isOpen, pos, type, data, closeMenu };
}

// --- Main Component ---
export default function ContextMenu() {
    const { isOpen, pos, type, data, closeMenu } = useContextMenu();
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [submenuHoveredId, setSubmenuHoveredId] = useState<string | null>(null);
    const [isSubMenuVisible, setIsSubMenuVisible] = useState(false);
    const [isSubMenuLocked, setIsSubMenuLocked] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleDownload = async () => {
        if (!data.src) return;
        try {
            const res = await fetch(data.src);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = data.src.split("/").pop() || "download";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            window.open(data.src, "_blank");
        }
        closeMenu();
    };

    const handleCopyLink = () => {
        if (!data.link) return;
        const url = data.link.startsWith('http') ? data.link : window.location.origin + data.link;
        navigator.clipboard.writeText(url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const navItems = [
        { label: "Home", href: "/" },
        { label: "Work", href: "/work" },
        { label: "Explorations", href: "/explorations" },
        { label: "Illustrations", href: "/illustrations" },
        { label: "Reading List", href: "/reading-list" },
        { label: "Writing", href: "/writing" },
        { label: "Archive", href: "/archive" },
    ];

    const handleResetHover = () => {
        if (!isSubMenuLocked) {
            setHoveredId(null);
            setIsSubMenuVisible(false);
        }
    };

    const handleResetSubmenuHover = () => {
        if (!isSubMenuLocked) {
            setIsSubMenuVisible(false);
            setSubmenuHoveredId(null);
        }
    };

    return (
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    className="fixed z-[100] min-w-[220px] bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl p-1 backdrop-blur-md cursor-pointer"
                    initial="initial"
                    animate="animate"
                    style={{ 
                        left: pos.alignX === 'left' ? pos.x : undefined,
                        right: pos.alignX === 'right' ? window.innerWidth - pos.x : undefined,
                        top: pos.alignY === 'top' ? pos.y : undefined,
                        bottom: pos.alignY === 'bottom' ? window.innerHeight - pos.y : undefined,
                    }}
                    transition={{
                        type: "spring", duration: 0.3, bounce: 0,
                        staggerChildren: 0.015, delayChildren: 0.05
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col" onMouseLeave={handleResetHover}>
                        {/* Contextual Section */}
                        {type === "card" && (
                            <>
                                <ContextMenuItem id="open" label="Open" hoveredId={hoveredId} setHoveredId={setHoveredId} onClick={() => { if(data.link) window.location.href = data.link; closeMenu(); }} />
                                <ContextMenuItem id="open-tab" label="Open in New Tab" hoveredId={hoveredId} setHoveredId={setHoveredId} onClick={() => { if(data.link) window.open(data.link, "_blank"); closeMenu(); }} />
                                <ContextMenuItem id="copy-link" label={isCopied ? "Copied" : "Copy Link"} hoveredId={hoveredId} setHoveredId={setHoveredId} onClick={handleCopyLink} />
                            </>
                        )}

                        {type === "image" && (
                            <ContextMenuItem id="download" label="Download Image" hoveredId={hoveredId} setHoveredId={setHoveredId} onClick={handleDownload} />
                        )}

                        {/* Navigation Section */}
                        <div 
                            className="relative"
                            onMouseEnter={() => setIsSubMenuVisible(true)}
                            onMouseLeave={handleResetSubmenuHover}
                        >
                            <ContextMenuItem
                                id="navigate"
                                label="Navigate"
                                hoveredId={hoveredId}
                                setHoveredId={setHoveredId}
                                onClick={(e) => { e.stopPropagation(); setIsSubMenuLocked(!isSubMenuLocked); setIsSubMenuVisible(true); }}
                                hasSubMenu
                            />
                            
                            <AnimatePresence>
                                {isSubMenuVisible && (
                                    <motion.div
                                        initial={{ opacity: 0, x: pos.alignX === 'left' ? -8 : 8, scale: 0.98 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: pos.alignX === 'left' ? -4 : 4, scale: 0.99 }}
                                        transition={{ type: "spring", duration: 0.3, bounce: 0, staggerChildren: 0.01 }}
                                        className={cn(
                                            "absolute min-w-[180px] bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl p-1 backdrop-blur-md",
                                            pos.alignY === 'top' ? "top-0" : "bottom-0",
                                            pos.alignX === 'left' ? "left-full ml-2" : "right-full mr-2"
                                        )}
                                    >
                                        <div className={cn("absolute top-0 w-4 h-full cursor-pointer", pos.alignX === 'left' ? "-left-4" : "-right-4")} />
                                        <motion.div className="flex flex-col" initial="initial" animate="animate">
                                            {navItems.map((item) => (
                                                <Link key={item.href} href={item.href} onClick={closeMenu}>
                                                    <ContextMenuItem
                                                        id={item.href}
                                                        label={item.label}
                                                        active={window.location.pathname === item.href}
                                                        hoveredId={submenuHoveredId}
                                                        setHoveredId={setSubmenuHoveredId}
                                                        layoutId="submenu-hover"
                                                    />
                                                </Link>
                                            ))}
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// --- Lean Item Component ---
interface ItemProps {
    id: string;
    label: string;
    onClick?: (e: React.MouseEvent) => void;
    active?: boolean;
    hoveredId: string | null;
    setHoveredId: (id: string | null) => void;
    hasSubMenu?: boolean;
    layoutId?: string;
    className?: string;
}

function ContextMenuItem({ 
    id, label, onClick, active, hoveredId, setHoveredId, hasSubMenu, layoutId = "menu-hover", className 
}: ItemProps) {
    const isSelected = hoveredId === id || (!hoveredId && active);
    
    return (
        <motion.div
            variants={{
                initial: { opacity: 0, y: 4 },
                animate: { opacity: 1, y: 0, transition: { type: "spring", duration: 0.3, bounce: 0 } }
            }}
            {...pressScale({ hover: 1, tap: 0.96 })}
            animate={{ color: isSelected ? "var(--content-primary)" : "var(--content-secondary)" }}
            transition={{ duration: 0.2 }}
            className={cn("relative flex items-center gap-3 px-3 py-2 rounded-[8px] group z-10", className)}
            onClick={onClick}
            onMouseEnter={() => setHoveredId(id)}
        >
            {isSelected && (
                <motion.div
                    layoutId={layoutId}
                    className="absolute inset-0 bg-[var(--background-tertiary)] rounded-[8px] -z-10 pointer-events-none"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
            )}
            <span className="label-s flex-1">{label}</span>
            {hasSubMenu && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            )}
        </motion.div>
    );
}
