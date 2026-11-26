"use client";

import { useEffect } from "react";

type SafariTouchEvent = TouchEvent & { scale?: number };

/**
 * Prevents manual pinch-to-zoom across iOS Safari, Android browsers, and trackpads.
 */
export function DisablePinchZoom() {
  useEffect(() => {
    const preventGesture = (event: Event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const preventMultiTouch = (event: SafariTouchEvent) => {
      const isPinch =
        event.touches.length > 1 || (event.scale !== undefined && event.scale !== 1);
      if (isPinch && event.cancelable) {
        event.preventDefault();
      }
    };

    const preventWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey && event.cancelable) {
        event.preventDefault();
      }
    };

    const listenerOptions: AddEventListenerOptions = { passive: false, capture: true };

    window.addEventListener("gesturestart", preventGesture, listenerOptions);
    window.addEventListener("gesturechange", preventGesture, listenerOptions);
    window.addEventListener("gestureend", preventGesture, listenerOptions);
    window.addEventListener("touchstart", preventMultiTouch, listenerOptions);
    window.addEventListener("touchmove", preventMultiTouch, listenerOptions);
    window.addEventListener("wheel", preventWheelZoom, listenerOptions);

    return () => {
      window.removeEventListener("gesturestart", preventGesture, { capture: true });
      window.removeEventListener("gesturechange", preventGesture, { capture: true });
      window.removeEventListener("gestureend", preventGesture, { capture: true });
      window.removeEventListener("touchstart", preventMultiTouch, { capture: true });
      window.removeEventListener("touchmove", preventMultiTouch, { capture: true });
      window.removeEventListener("wheel", preventWheelZoom, { capture: true });
    };
  }, []);

  return null;
}
