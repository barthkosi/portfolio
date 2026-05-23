"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import { SCROLL_TO_TOP_EVENT } from "@/components/ScrollToTop";

interface SmoothScrollProviderProps {
    children: ReactNode;
}

export default function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
    const lenisRef = useRef<Lenis | null>(null);
    const rafIdRef = useRef<number | null>(null);

    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (time) => Math.min(1, 1.001 - Math.pow(2, -10 * time)),
            orientation: "vertical",
            smoothWheel: true,
            touchInertiaExponent: 1.2,
        });

        lenisRef.current = lenis;

        const handleScrollToTop = () => {
            lenis.scrollTo(0, { immediate: true });
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });

            requestAnimationFrame(() => {
                lenis.scrollTo(0, { immediate: true });
                window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            });
        };

        const raf = (time: number) => {
            lenis.raf(time);
            rafIdRef.current = requestAnimationFrame(raf);
        };

        rafIdRef.current = requestAnimationFrame(raf);
        window.addEventListener(SCROLL_TO_TOP_EVENT, handleScrollToTop);

        return () => {
            window.removeEventListener(SCROLL_TO_TOP_EVENT, handleScrollToTop);

            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }

            lenis.destroy();
            lenisRef.current = null;
        };
    }, []);

    return <>{children}</>;
}
