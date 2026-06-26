"use client";

import { type Transition } from "motion/react";

export const DEFAULT_EASE = [0.23, 1, 0.32, 1] as const;
export const DEFAULT_DURATION = 0.35;
export const DEFAULT_DISTANCE = 20;

export const physics = {
    standard: { type: "tween", ease: DEFAULT_EASE, duration: DEFAULT_DURATION },
    fast: { type: "tween", ease: DEFAULT_EASE, duration: 0.2 },
    slow: { type: "tween", ease: DEFAULT_EASE, duration: 0.8 },
    bouncy: { type: "spring", stiffness: 265, damping: 22, mass: 2 },
    snappy: { type: "spring", stiffness: 400, damping: 28, mass: 1 },
} as const;

export const springBouncy = physics.bouncy;
export const springSnappy = physics.snappy;
export const springBase = physics.snappy;

type PressScaleOptions = {
    hover?: number;
    tap?: number;
    transition?: Transition;
};

export const pressScale = ({
    hover = 1.03,
    tap = 0.97,
    transition = springBase,
}: PressScaleOptions = {}) => ({
    whileHover: { scale: hover },
    whileTap: { scale: tap },
    transition,
});

export const anim = {
    upSnappy: {
        initial: { opacity: 0, y: DEFAULT_DISTANCE },
        animate: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.snappy },
        exit: { opacity: 0, y: DEFAULT_DISTANCE, transition: physics.snappy },
        hidden: { opacity: 0, y: DEFAULT_DISTANCE },
        visible: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.snappy }
    },
    fadeDown: {
        initial: { opacity: 0, y: -DEFAULT_DISTANCE },
        animate: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.standard },
        exit: { opacity: 0, y: -DEFAULT_DISTANCE, transition: physics.standard },
        hidden: { opacity: 0, y: -DEFAULT_DISTANCE },
        visible: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.standard }
    },
    fadeDownBouncy: {
        initial: { opacity: 0, y: -DEFAULT_DISTANCE },
        animate: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.bouncy },
        exit: { opacity: 0, y: -DEFAULT_DISTANCE, transition: physics.bouncy },
        hidden: { opacity: 0, y: -DEFAULT_DISTANCE },
        visible: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.bouncy }
    },
    fadeDownBouncyBouncy: {
        initial: { opacity: 0, y: -DEFAULT_DISTANCE },
        animate: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.bouncy },
        exit: { opacity: 0, y: -DEFAULT_DISTANCE, transition: physics.bouncy },
        hidden: { opacity: 0, y: -DEFAULT_DISTANCE },
        visible: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.bouncy }
    },
    fadeRightBouncy: {
        initial: { opacity: 0, x: DEFAULT_DISTANCE },
        animate: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.bouncy },
        exit: { opacity: 0, x: DEFAULT_DISTANCE, transition: physics.bouncy },
        hidden: { opacity: 0, x: DEFAULT_DISTANCE },
        visible: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.bouncy }
    },
    fadeUpBouncy: {
        initial: { opacity: 0, y: DEFAULT_DISTANCE },
        animate: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.bouncy },
        exit: { opacity: 0, y: DEFAULT_DISTANCE, transition: physics.bouncy },
        hidden: { opacity: 0, y: DEFAULT_DISTANCE },
        visible: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.bouncy }
    },
    FadeUpBouncyBouncy: {
        initial: { opacity: 0, y: DEFAULT_DISTANCE },
        animate: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.bouncy },
        exit: { opacity: 0, y: DEFAULT_DISTANCE, transition: physics.bouncy },
        hidden: { opacity: 0, y: DEFAULT_DISTANCE },
        visible: { opacity: 1, scale: 1, x: 0, y: 0, transition: physics.bouncy }
    }
} as const;

export const stagger = (interval = 0.1, delay = 0) => ({
    hidden: {},
    visible: {
        transition: {
            staggerChildren: interval,
            delayChildren: delay,
        },
    },
    animate: {
        transition: {
            staggerChildren: interval,
            delayChildren: delay,
        },
    },
});

// Shared animation variants
export const fadeUpVariant = {
    hidden: anim.fadeUpBouncy.hidden,
    visible: anim.fadeUpBouncy.visible,
};

// Shared gradient mask styles for marquee/carousel effects
export const gradientMaskVertical = {
    maskImage: 'linear-gradient(rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 12.5%, rgb(0, 0, 0) 87.5%, rgba(0, 0, 0, 0) 100%)',
    WebkitMaskImage: 'linear-gradient(rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 12.5%, rgb(0, 0, 0) 87.5%, rgba(0, 0, 0, 0) 100%)'
};

export const gradientMaskHorizontal = {
    maskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 10%, rgb(0, 0, 0) 90%, rgba(0, 0, 0, 0) 100%)',
    WebkitMaskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 10%, rgb(0, 0, 0) 90%, rgba(0, 0, 0, 0) 100%)'
};
