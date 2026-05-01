"use client";

import { useEffect } from "react";

/**
 * Prevents pinch-to-zoom and double-tap zoom on mobile devices.
 * iOS Safari ignores viewport meta tag zoom restrictions since iOS 10,
 * so this uses JavaScript event listeners as a fallback.
 */
export default function DisableZoom() {
    useEffect(() => {
        // Prevent iOS Safari pinch-to-zoom (gesturestart is Safari-specific)
        const preventGesture = (e: Event) => {
            e.preventDefault();
        };

        // Prevent multi-touch zoom on all browsers
        const preventMultiTouchZoom = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        };

        document.addEventListener("gesturestart", preventGesture, {
            passive: false,
        });
        document.addEventListener("gesturechange", preventGesture, {
            passive: false,
        });
        document.addEventListener("gestureend", preventGesture, {
            passive: false,
        });
        document.addEventListener("touchmove", preventMultiTouchZoom, {
            passive: false,
        });

        return () => {
            document.removeEventListener("gesturestart", preventGesture);
            document.removeEventListener("gesturechange", preventGesture);
            document.removeEventListener("gestureend", preventGesture);
            document.removeEventListener("touchmove", preventMultiTouchZoom);
        };
    }, []);

    return null;
}
