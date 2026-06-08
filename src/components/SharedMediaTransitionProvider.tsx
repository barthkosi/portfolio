"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
    getCloudinaryOptimizedVideoSrc,
    getCloudinaryVideoThumbnailSrc,
    isCloudinaryVideoUrl,
} from "@/lib/image-urls";

type MediaKind = "image" | "video";

type TransitionRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type SharedMediaTransition = {
    id: string;
    source: string;
    bannerImage?: string;
    mediaKind: MediaKind;
    origin: TransitionRect;
    target?: TransitionRect;
    showBanner: boolean;
};

type StartTransitionInput = {
    id: string;
    source: string;
    bannerImage?: string;
    mediaKind: MediaKind;
    origin: TransitionRect;
};

type SharedMediaTransitionContextValue = {
    activeTransition: SharedMediaTransition | null;
    startTransition: (input: StartTransitionInput) => void;
    registerTarget: (id: string, target: TransitionRect) => void;
    finishTransition: () => void;
};

const SharedMediaTransitionContext =
    createContext<SharedMediaTransitionContextValue | null>(null);

const BANNER_FADE_DELAY = 260;
const OVERLAY_CLEAR_DELAY = 760;

const rectFromDomRect = (rect: DOMRect): TransitionRect => ({
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
});

const getFallbackTarget = (): TransitionRect => {
    if (typeof window === "undefined") {
        return { x: 0, y: 0, width: 1, height: 1 };
    }

    const width = window.innerWidth;
    const height = width * (6 / 16);

    return {
        x: 0,
        y: 0,
        width,
        height,
    };
};

const getMediaSource = (transition: SharedMediaTransition) => {
    if (
        transition.mediaKind === "video" &&
        isCloudinaryVideoUrl(transition.source)
    ) {
        return getCloudinaryOptimizedVideoSrc(transition.source);
    }

    return transition.source;
};

const getVideoPoster = (transition: SharedMediaTransition) => {
    if (
        transition.mediaKind === "video" &&
        isCloudinaryVideoUrl(transition.source)
    ) {
        return getCloudinaryVideoThumbnailSrc(transition.source);
    }

    return undefined;
};

export function getSharedMediaRect(element: HTMLElement): TransitionRect {
    return rectFromDomRect(element.getBoundingClientRect());
}

export function useSharedMediaTransition() {
    const context = useContext(SharedMediaTransitionContext);

    if (!context) {
        throw new Error(
            "useSharedMediaTransition must be used within SharedMediaTransitionProvider"
        );
    }

    return context;
}

export default function SharedMediaTransitionProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [transition, setTransition] =
        useState<SharedMediaTransition | null>(null);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const portalRoot =
        typeof document === "undefined" ? null : document.body;

    const clearTimers = useCallback(() => {
        for (const timer of timersRef.current) {
            clearTimeout(timer);
        }

        timersRef.current = [];
    }, []);

    const finishTransition = useCallback(() => {
        clearTimers();
        setTransition(null);
    }, [clearTimers]);

    const startTransition = useCallback(
        (input: StartTransitionInput) => {
            clearTimers();
            setTransition({
                ...input,
                showBanner: false,
            });
        },
        [clearTimers]
    );

    const registerTarget = useCallback(
        (id: string, target: TransitionRect) => {
            setTransition((current) => {
                if (!current || current.id !== id) return current;

                return {
                    ...current,
                    target,
                };
            });

            clearTimers();

            const fadeTimer = setTimeout(() => {
                setTransition((current) => {
                    if (!current || current.id !== id || !current.bannerImage) {
                        return current;
                    }

                    return {
                        ...current,
                        showBanner: true,
                    };
                });
            }, BANNER_FADE_DELAY);

            const clearTimer = setTimeout(() => {
                setTransition((current) =>
                    current?.id === id ? null : current
                );
            }, OVERLAY_CLEAR_DELAY);

            timersRef.current = [fadeTimer, clearTimer];
        },
        [clearTimers]
    );

    const value = useMemo(
        () => ({
            activeTransition: transition,
            startTransition,
            registerTarget,
            finishTransition,
        }),
        [finishTransition, registerTarget, startTransition, transition]
    );

    const target = transition?.target ?? getFallbackTarget();

    return (
        <SharedMediaTransitionContext.Provider value={value}>
            {children}
            {portalRoot &&
                createPortal(
                    <AnimatePresence>
                        {transition && (
                            <motion.div
                                className="fixed inset-0 z-40 pointer-events-none"
                                initial={{ opacity: 1 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                aria-hidden="true"
                            >
                                <motion.div
                                    className="absolute inset-0 bg-black/40"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: transition.target ? 0 : 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{
                                        duration: 0.3,
                                        ease: "easeInOut",
                                    }}
                                />

                                <motion.div
                                    className="fixed overflow-hidden rounded-b-xl lg:rounded-b-3xl bg-[var(--background-secondary)] shadow-[0_24px_80px_rgba(0,0,0,0.32)]"
                                    initial={{
                                        left: transition.origin.x,
                                        top: transition.origin.y,
                                        width: transition.origin.width,
                                        height: transition.origin.height,
                                    }}
                                    animate={{
                                        left: target.x,
                                        top: target.y,
                                        width: target.width,
                                        height: target.height,
                                    }}
                                    exit={{
                                        opacity: 0,
                                        scale: 0.995,
                                    }}
                                    transition={{
                                        type: "spring",
                                        duration: 0.58,
                                        bounce: 0,
                                    }}
                                >
                                    {transition.mediaKind === "video" ? (
                                        <video
                                            src={getMediaSource(transition)}
                                            poster={getVideoPoster(transition)}
                                            className="absolute inset-0 h-full w-full object-cover"
                                            autoPlay
                                            muted
                                            loop
                                            playsInline
                                        />
                                    ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={transition.source}
                                            alt=""
                                            className="absolute inset-0 h-full w-full object-cover"
                                        />
                                    )}

                                    {transition.bannerImage && (
                                        <motion.img
                                            src={transition.bannerImage}
                                            alt=""
                                            className="absolute inset-0 h-full w-full object-cover"
                                            initial={{ opacity: 0 }}
                                            animate={{
                                                opacity: transition.showBanner ? 1 : 0,
                                            }}
                                            transition={{
                                                duration: 0.68,
                                                ease: [0.23, 1, 0.32, 1],
                                            }}
                                        />
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    portalRoot
                )}
        </SharedMediaTransitionContext.Provider>
    );
}
