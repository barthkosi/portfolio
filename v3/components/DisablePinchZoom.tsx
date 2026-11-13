"use client";

import { useEffect } from "react";

type SafariTouchEvent = TouchEvent & { scale?: number };

/**
 * Prevents manual pinch-to-zoom on iOS Safari, including mid-scroll multi-touch gestures.
 */
export function DisablePinchZoom() {
  useEffect(() => {
    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    const preventMultiTouch = (event: SafariTouchEvent) => {
      if (event.touches.length > 1 || (event.scale !== undefined && event.scale !== 1)) {
        event.preventDefault();
      }
    };

    const listenerOptions: AddEventListenerOptions = { passive: false, capture: true };

    document.addEventListener("gesturestart", preventGesture, listenerOptions);
    document.addEventListener("gesturechange", preventGesture, listenerOptions);
    document.addEventListener("gestureend", preventGesture, listenerOptions);
    document.addEventListener("touchstart", preventMultiTouch, listenerOptions);
    document.addEventListener("touchmove", preventMultiTouch, listenerOptions);

    return () => {
      document.removeEventListener("gesturestart", preventGesture, { capture: true });
      document.removeEventListener("gesturechange", preventGesture, { capture: true });
      document.removeEventListener("gestureend", preventGesture, { capture: true });
      document.removeEventListener("touchstart", preventMultiTouch, { capture: true });
      document.removeEventListener("touchmove", preventMultiTouch, { capture: true });
    };
  }, []);

  return null;
}
