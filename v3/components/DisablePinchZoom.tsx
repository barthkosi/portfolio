"use client";

import { useEffect } from "react";

/**
 * Prevents manual pinch-to-zoom on iOS Safari, which ignores `user-scalable=no`.
 */
export function DisablePinchZoom() {
  useEffect(() => {
    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("touchmove", preventMultiTouch, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("touchmove", preventMultiTouch);
    };
  }, []);

  return null;
}
