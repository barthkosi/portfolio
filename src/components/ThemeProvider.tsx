"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";

// Suppress React 19 "Encountered a script tag" warning from next-themes
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const originalConsoleError = console.error;
    console.error = (...args: Parameters<typeof console.error>) => {
        if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) {
            return;
        }
        originalConsoleError.apply(console, args);
    };
}

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
