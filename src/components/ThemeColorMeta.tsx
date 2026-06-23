"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const THEME_COLORS = {
    light: "#FFFFFF", // --background-primary (light)
    dark: "#0D0D0D",  // --background-primary (dark)
} as const;

/**
 * Dynamically updates <meta name="theme-color"> whenever the active theme
 * changes, which makes Chrome on Android paint its status bar / tab strip
 * to match --background-primary.
 */
export default function ThemeColorMeta() {
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        const color =
            resolvedTheme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light;

        let meta = document.querySelector<HTMLMetaElement>(
            'meta[name="theme-color"]'
        );

        if (!meta) {
            meta = document.createElement("meta");
            meta.name = "theme-color";
            document.head.appendChild(meta);
        }

        meta.content = color;
    }, [resolvedTheme]);

    return null;
}
