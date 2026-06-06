"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { pressScale } from "@/lib/transitions";
import { cn } from "@/lib/utils";
import { getImageFileName, getOriginalImageSource } from "@/lib/image-urls";

// --- Constants & Types ---
const MENU_WIDTH = 220;
const MENU_ITEM_HEIGHT = 34;
const VERTICAL_THRESHOLD = 350;
const HORIZONTAL_THRESHOLD = 200;
const CONTEXT_IMAGE_SRC_ATTRIBUTE = "data-context-image-src";
const TOUCH_CONTEXT_MENU_SUPPRESSION_MS = 900;
const NAV_ITEMS = [
    { label: "Home", href: "/" },
    { label: "Work", href: "/work" },
    { label: "Explorations", href: "/explorations" },
    { label: "Illustrations", href: "/illustrations" },
    { label: "Reading List", href: "/reading-list" },
    { label: "Writing", href: "/writing" },
    { label: "Archive", href: "/archive" },
];

type MenuType = "default" | "card" | "image";
type KeyboardScope = "main" | "submenu";

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

const isTouchGeneratedContextMenu = (
    event: MouseEvent,
    lastTouchTime: number
) => {
    const eventWithSource = event as MouseEvent & {
        pointerType?: string;
        sourceCapabilities?: { firesTouchEvents?: boolean };
    };

    return (
        eventWithSource.pointerType === "touch" ||
        eventWithSource.sourceCapabilities?.firesTouchEvents === true ||
        Date.now() - lastTouchTime < TOUCH_CONTEXT_MENU_SUPPRESSION_MS
    );
};

// --- Custom Hook: State & Events ---
function useContextMenu(onOpen?: () => void) {
    const [isOpen, setIsOpen] = useState(false);
    const [openKey, setOpenKey] = useState(0);
    const [pos, setPos] = useState<MenuPos>({ x: 0, y: 0, alignX: 'left', alignY: 'top' });
    const [type, setType] = useState<MenuType>("default");
    const [data, setData] = useState<ContextMenuData>({});
    const lastTouchTimeRef = useRef(0);

    const closeMenu = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        const handleTouchStart = () => {
            lastTouchTimeRef.current = Date.now();
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();

            if (
                isTouchGeneratedContextMenu(e, lastTouchTimeRef.current)
            ) {
                closeMenu();
                return;
            }
            
            const target = e.target as HTMLElement;
            const card = target.closest('[data-context="card"]');
            const contextualImage = target.closest(
                `[${CONTEXT_IMAGE_SRC_ATTRIBUTE}]`
            ) as HTMLElement | null;
            const media = target.closest('img, video') as HTMLImageElement | HTMLVideoElement;

            let menuType: MenuType = "default";
            let menuData: ContextMenuData = {};

            if (card) {
                menuType = "card";
                menuData = {
                    link: card.getAttribute('data-card-link') || undefined,
                    title: card.getAttribute('data-card-title') || undefined,
                };
            } else if (contextualImage) {
                const imageSrc = contextualImage.getAttribute(
                    CONTEXT_IMAGE_SRC_ATTRIBUTE
                );

                menuType = "image";
                menuData = {
                    src: imageSrc
                        ? getOriginalImageSource(imageSrc, window.location.href)
                        : undefined,
                };
            } else if (media) {
                const mediaSrc = media.dataset.originalSrc || media.currentSrc || media.src;

                menuType = "image";
                menuData = { src: getOriginalImageSource(mediaSrc, window.location.href) };
            }

            const x = e.clientX;
            const y = e.clientY;

            onOpen?.();
            setPos({
                x, y,
                alignX: x + MENU_WIDTH + HORIZONTAL_THRESHOLD > window.innerWidth ? 'right' : 'left',
                alignY: y + VERTICAL_THRESHOLD > window.innerHeight ? 'bottom' : 'top'
            });
            setType(menuType);
            setData(menuData);
            setOpenKey((currentKey) => currentKey + 1);
            setIsOpen(true);
        };

        window.addEventListener("touchstart", handleTouchStart, {
            capture: true,
            passive: true,
        });
        window.addEventListener("contextmenu", handleContextMenu);
        window.addEventListener("click", closeMenu);
        window.addEventListener("scroll", closeMenu, true);

        return () => {
            window.removeEventListener("touchstart", handleTouchStart, true);
            window.removeEventListener("contextmenu", handleContextMenu);
            window.removeEventListener("click", closeMenu);
            window.removeEventListener("scroll", closeMenu, true);
        };
    }, [closeMenu, onOpen]);

    // Global cursor management
    useEffect(() => {
        document.body.classList.toggle('force-pointer-cursor', isOpen);
        return () => document.body.classList.remove('force-pointer-cursor');
    }, [isOpen]);

    return { isOpen, openKey, pos, type, data, closeMenu };
}

// --- Main Component ---
export default function ContextMenu() {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [submenuHoveredId, setSubmenuHoveredId] = useState<string | null>(null);
    const [isSubMenuVisible, setIsSubMenuVisible] = useState(false);
    const [isSubMenuLocked, setIsSubMenuLocked] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [keyboardScope, setKeyboardScope] = useState<KeyboardScope>("main");

    const resetMenuInteraction = useCallback(() => {
        setHoveredId(null);
        setSubmenuHoveredId(null);
        setIsSubMenuVisible(false);
        setIsSubMenuLocked(false);
        setIsCopied(false);
        setKeyboardScope("main");
    }, []);

    const { isOpen, openKey, pos, type, data, closeMenu } = useContextMenu(resetMenuInteraction);

    const menuItemIds = useMemo(() => {
        const ids: string[] = [];

        if (type === "card") {
            ids.push("open", "open-tab", "copy-link");
        }

        if (type === "image") {
            ids.push("open-image-tab", "download");
        }

        ids.push("navigate");

        return ids;
    }, [type]);
    const submenuItemIds = useMemo(() => NAV_ITEMS.map((item) => item.href), []);
    const mainHighlightIndex = hoveredId ? menuItemIds.indexOf(hoveredId) : -1;
    const submenuHighlightIndex = submenuHoveredId
        ? submenuItemIds.indexOf(submenuHoveredId)
        : NAV_ITEMS.findIndex((item) => typeof window !== "undefined" && item.href === window.location.pathname);

    const getDefaultSubmenuId = useCallback(() => {
        if (typeof window !== "undefined") {
            const activeItem = NAV_ITEMS.find((item) => item.href === window.location.pathname);

            if (activeItem) {
                return activeItem.href;
            }
        }

        return NAV_ITEMS[0]?.href ?? null;
    }, []);

    const setMainHoveredId = useCallback((id: string | null) => {
        setKeyboardScope("main");
        setHoveredId(id);
    }, []);

    const setSubmenuHoveredIdFromPointer = useCallback((id: string | null) => {
        setKeyboardScope("submenu");
        setSubmenuHoveredId(id);
    }, []);

    const handleDownload = useCallback(async () => {
        if (!data.src) return;
        const downloadSrc = getOriginalImageSource(data.src, window.location.href);

        try {
            const res = await fetch(downloadSrc);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = getImageFileName(downloadSrc);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            window.open(downloadSrc, "_blank");
        }
        closeMenu();
    }, [closeMenu, data.src]);

    const handleOpenCard = useCallback(() => {
        if (!data.link) return;

        window.location.href = data.link;
        closeMenu();
    }, [closeMenu, data.link]);

    const handleOpenCardInNewTab = useCallback(() => {
        if (!data.link) return;

        window.open(data.link, "_blank", "noopener,noreferrer");
        closeMenu();
    }, [closeMenu, data.link]);

    const handleOpenImageInNewTab = useCallback(() => {
        if (!data.src) return;
        const imageSrc = getOriginalImageSource(data.src, window.location.href);

        window.open(imageSrc, "_blank", "noopener,noreferrer");
        closeMenu();
    }, [closeMenu, data.src]);

    const handleCopyLink = useCallback(() => {
        if (!data.link) return;
        const url = data.link.startsWith('http') ? data.link : window.location.origin + data.link;
        navigator.clipboard.writeText(url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }, [data.link]);

    const handleToggleSubmenu = useCallback((event?: React.MouseEvent) => {
        event?.stopPropagation();
        setHoveredId("navigate");
        setKeyboardScope("main");
        setIsSubMenuLocked((isLocked) => !isLocked);
        setIsSubMenuVisible(true);
    }, []);

    const enterSubmenu = useCallback(() => {
        const defaultSubmenuId = getDefaultSubmenuId();

        setHoveredId("navigate");
        setIsSubMenuVisible(true);
        setKeyboardScope("submenu");
        setSubmenuHoveredId((currentId) => currentId || defaultSubmenuId);
    }, [getDefaultSubmenuId]);

    const returnToMainMenu = useCallback(() => {
        setKeyboardScope("main");
        setSubmenuHoveredId(null);
        setHoveredId("navigate");

        if (!isSubMenuLocked) {
            setIsSubMenuVisible(true);
        }
    }, [isSubMenuLocked]);

    const moveSelection = useCallback((direction: 1 | -1) => {
        if (keyboardScope === "submenu") {
            if (submenuItemIds.length === 0) {
                return;
            }

            setSubmenuHoveredId((currentId) => {
                const currentIndex = currentId ? submenuItemIds.indexOf(currentId) : -1;
                const nextIndex =
                    currentIndex === -1
                        ? direction === 1 ? 0 : submenuItemIds.length - 1
                        : (currentIndex + direction + submenuItemIds.length) % submenuItemIds.length;

                return submenuItemIds[nextIndex];
            });
            return;
        }

        if (menuItemIds.length === 0) {
            return;
        }

        setSubmenuHoveredId(null);
        setHoveredId((currentId) => {
            const currentIndex = currentId ? menuItemIds.indexOf(currentId) : -1;
            const nextIndex =
                currentIndex === -1
                    ? direction === 1 ? 0 : menuItemIds.length - 1
                    : (currentIndex + direction + menuItemIds.length) % menuItemIds.length;
            const nextId = menuItemIds[nextIndex];

            if (!isSubMenuLocked) {
                setIsSubMenuVisible(nextId === "navigate");
            }

            return nextId;
        });
    }, [isSubMenuLocked, keyboardScope, menuItemIds, submenuItemIds]);

    const activateSelectedItem = useCallback(() => {
        if (keyboardScope === "submenu") {
            if (submenuHoveredId) {
                window.location.href = submenuHoveredId;
                closeMenu();
            }

            return;
        }

        switch (hoveredId) {
            case "open":
                handleOpenCard();
                break;
            case "open-tab":
                handleOpenCardInNewTab();
                break;
            case "copy-link":
                handleCopyLink();
                break;
            case "open-image-tab":
                handleOpenImageInNewTab();
                break;
            case "download":
                void handleDownload();
                break;
            case "navigate":
                handleToggleSubmenu();
                break;
            default:
                break;
        }
    }, [
        handleCopyLink,
        handleDownload,
        handleOpenCard,
        handleOpenCardInNewTab,
        handleOpenImageInNewTab,
        handleToggleSubmenu,
        hoveredId,
        keyboardScope,
        closeMenu,
        submenuHoveredId,
    ]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                event.stopPropagation();
                moveSelection(event.key === "ArrowDown" ? 1 : -1);
                return;
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                event.stopPropagation();

                if (keyboardScope === "main" && hoveredId === "navigate" && pos.alignX === "left") {
                    enterSubmenu();
                } else if (keyboardScope === "submenu" && pos.alignX === "right") {
                    returnToMainMenu();
                }

                return;
            }

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                event.stopPropagation();

                if (keyboardScope === "main" && hoveredId === "navigate" && pos.alignX === "right") {
                    enterSubmenu();
                } else if (keyboardScope === "submenu" && pos.alignX === "left") {
                    returnToMainMenu();
                }

                return;
            }

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                activateSelectedItem();
                return;
            }

            if (event.key === "Escape") {
                event.preventDefault();
                closeMenu();
            }
        };

        document.addEventListener("keydown", handleKeyDown, true);

        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [
        activateSelectedItem,
        closeMenu,
        enterSubmenu,
        hoveredId,
        isOpen,
        keyboardScope,
        moveSelection,
        pos.alignX,
        returnToMainMenu,
    ]);

    const handleResetHover = () => {
        if (!isSubMenuLocked && keyboardScope !== "submenu") {
            setHoveredId(null);
            setIsSubMenuVisible(false);
        }
    };

    const handleResetSubmenuHover = () => {
        if (!isSubMenuLocked && keyboardScope !== "submenu") {
            setIsSubMenuVisible(false);
            setSubmenuHoveredId(null);
        }
    };

    return (
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    key={openKey}
                    className="fixed z-[120] min-w-[220px] bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl p-1 backdrop-blur-md cursor-pointer"
                    variants={{
                        initial: { opacity: 0, scale: 0.98, y: 4 },
                        animate: { opacity: 1, scale: 1, y: 0 },
                        exit: { opacity: 0, scale: 0.98, y: 2 },
                    }}
                    initial="initial"
                    animate="animate"
                    exit="exit"
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
                    <div className="relative isolate flex flex-col" onMouseLeave={handleResetHover}>
                        <ContextMenuHighlight selectedIndex={mainHighlightIndex} />

                        {/* Contextual Section */}
                        {type === "card" && (
                            <>
                                <ContextMenuItem id="open" label="Open" hoveredId={hoveredId} setHoveredId={setMainHoveredId} onClick={handleOpenCard} />
                                <ContextMenuItem id="open-tab" label="Open in New Tab" hoveredId={hoveredId} setHoveredId={setMainHoveredId} onClick={handleOpenCardInNewTab} />
                                <ContextMenuItem id="copy-link" label={isCopied ? "Copied" : "Copy Link"} hoveredId={hoveredId} setHoveredId={setMainHoveredId} onClick={handleCopyLink} />
                            </>
                        )}

                        {type === "image" && (
                            <>
                                <ContextMenuItem id="open-image-tab" label="Open Image in New Tab" hoveredId={hoveredId} setHoveredId={setMainHoveredId} onClick={handleOpenImageInNewTab} />
                                <ContextMenuItem id="download" label="Download Image" hoveredId={hoveredId} setHoveredId={setMainHoveredId} onClick={handleDownload} />
                            </>
                        )}

                        {/* Navigation Section */}
                        <div 
                            className="relative"
                            onMouseEnter={() => {
                                setKeyboardScope("main");
                                setIsSubMenuVisible(true);
                            }}
                            onMouseLeave={handleResetSubmenuHover}
                        >
                            <ContextMenuItem
                                id="navigate"
                                label="Navigate"
                                hoveredId={hoveredId}
                                setHoveredId={setMainHoveredId}
                                onClick={handleToggleSubmenu}
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
                                        <motion.div className="relative isolate flex flex-col" initial="initial" animate="animate">
                                            <ContextMenuHighlight selectedIndex={submenuHighlightIndex} />

                                            {NAV_ITEMS.map((item) => (
                                                <Link key={item.href} href={item.href} onClick={closeMenu}>
                                                    <ContextMenuItem
                                                        id={item.href}
                                                        label={item.label}
                                                        active={window.location.pathname === item.href}
                                                        hoveredId={submenuHoveredId}
                                                        setHoveredId={setSubmenuHoveredIdFromPointer}
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

function ContextMenuHighlight({ selectedIndex }: { selectedIndex: number }) {
    const isVisible = selectedIndex >= 0;

    return (
        <motion.div
            aria-hidden
            className="absolute left-0 right-0 top-0 z-0 h-[34px] rounded-[8px] bg-[var(--background-tertiary)] pointer-events-none"
            initial={false}
            animate={{
                opacity: isVisible ? 1 : 0,
                y: isVisible ? selectedIndex * MENU_ITEM_HEIGHT : 0,
            }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        />
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
    className?: string;
}

function ContextMenuItem({ 
    id, label, onClick, active, hoveredId, setHoveredId, hasSubMenu, className 
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
            className={cn("relative z-10 flex h-[34px] items-center gap-3 px-3 rounded-[8px] group", className)}
            onClick={onClick}
            onMouseEnter={() => setHoveredId(id)}
        >
            <span className="label-s flex-1">{label}</span>
            {hasSubMenu && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            )}
        </motion.div>
    );
}
