"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const THEME_COLORS = {
    light: "#FFFFFF", // --background-primary (light)
    dark: "#0D0D0D",  // --background-primary (dark)
} as const;

/**
 * Dynamically controls <meta name="theme-color"> for Chrome on Android's
 * status bar / tab strip color.
 *
 * Key details:
 * - next-themes' resolvedTheme is `undefined` on first render (before mount)
 *   because it needs to read localStorage / system preference on the client.
 *   We guard against this with a `mounted` flag so we never write the wrong
 *   color during hydration.
 * - Once mounted and the real theme is known, we clear all existing
 *   theme-color tags (including Next.js's SSR media-queried ones) and insert
 *   a single authoritative tag without a `media` attribute, which Chrome on
 *   Android reads most reliably.
 * - The SSR media-queried tags (from viewport.themeColor in layout.tsx) serve
 *   as the correct fallback before this JS runs.
 */
export default function ThemeColorMeta() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Step 1: mark as mounted so we know next-themes has resolved the real theme
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    // Step 2: once mounted (and on every subsequent theme change), sync the tag
    useEffect(() => {
        if (!mounted) return;
        if (!resolvedTheme) return;

        const color = resolvedTheme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light;

        // Find existing theme-color meta tags (including the media-queried SSR ones)
        const metaTags = document.querySelectorAll('meta[name="theme-color"]');
        
        if (metaTags.length > 0) {
            metaTags.forEach((el) => {
                // Remove media attribute so Chrome Android reads it dynamically
                if (el.hasAttribute("media")) {
                    el.removeAttribute("media");
                }
                el.setAttribute("content", color);
            });
        } else {
            // Insert fallback tag if none exists
            const meta = document.createElement("meta");
            meta.name = "theme-color";
            meta.content = color;
            document.head.appendChild(meta);
        }
    }, [mounted, resolvedTheme]);

    return null;
}
