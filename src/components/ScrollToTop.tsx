"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * ScrollToTop component that scrolls the page to the top
 * whenever the route changes. This ensures pages always
 * start at the top regardless of previous scroll position.
 */
export default function ScrollToTop() {
    const pathname = usePathname();

    useEffect(() => {
        // Scroll to top on route change
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}
