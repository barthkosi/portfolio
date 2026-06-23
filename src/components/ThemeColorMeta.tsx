"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const THEME_COLORS = {
    light: "#FFFFFF", // --background-primary (light)
    dark: "#0D0D0D",  // --background-primary (dark)
} as const;

/**
 * Dynamically controls <meta name="theme-color"> for Chrome on Android's
 * status bar / tab strip color.
 *
 * Next.js viewport.themeColor renders two media-queried tags, which Safari
 * handles fine but Chrome on Android does not. On mount this component
 * removes all existing theme-color tags and replaces them with a single
 * authoritative tag (no media attribute) — the format Chrome requires.
 * It then keeps it in sync whenever the active theme changes.
 */
export default function ThemeColorMeta() {
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        const color =
            resolvedTheme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light;

        // Remove ALL existing theme-color meta tags, including the two
        // media-queried ones that Next.js injects from viewport.themeColor.
        // Chrome on Android only reliably reads a single tag with no media attr.
        document
            .querySelectorAll('meta[name="theme-color"]')
            .forEach((el) => el.remove());

        const meta = document.createElement("meta");
        meta.name = "theme-color";
        meta.content = color;
        document.head.appendChild(meta);
    }, [resolvedTheme]);

    return null;
}
