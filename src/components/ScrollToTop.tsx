"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SCROLL_TO_TOP_EVENT = "app:scroll-to-top";

export default function ScrollToTop() {
    const pathname = usePathname();

    useEffect(() => {
        const scrollToTop = () => {
            window.dispatchEvent(new CustomEvent(SCROLL_TO_TOP_EVENT));

            window.scrollTo({ top: 0, left: 0, behavior: "auto" });

            requestAnimationFrame(() => {
                window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            });
        };

        scrollToTop();
    }, [pathname]);

    return null;
}

export { SCROLL_TO_TOP_EVENT };
