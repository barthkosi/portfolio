import { anim } from "./transitions";

/**
 * Shared animation utilities for Home page components
 */

// Reusable fade-up bouncy variant (replaces 15+ inline definitions)
export const fadeUpVariant = {
    hidden: anim.fadeUpBouncy.hidden,
    visible: anim.fadeUpBouncy.visible,
};

// Standard viewport config for scroll-triggered animations
export const inViewConfig = {
    once: true,
    margin: "0px 0px -150px 0px"
};

// Gradient mask styles for marquee sections
export const gradientMaskVertical = {
    maskImage: 'linear-gradient(rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 12.5%, rgb(0, 0, 0) 87.5%, rgba(0, 0, 0, 0) 100%)',
    WebkitMaskImage: 'linear-gradient(rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 12.5%, rgb(0, 0, 0) 87.5%, rgba(0, 0, 0, 0) 100%)'
};

export const gradientMaskHorizontal = {
    maskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 10%, rgb(0, 0, 0) 90%, rgba(0, 0, 0, 0) 100%)',
    WebkitMaskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 10%, rgb(0, 0, 0) 90%, rgba(0, 0, 0, 0) 100%)'
};
