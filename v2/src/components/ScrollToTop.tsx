"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SCROLL_TO_TOP_EVENT = "app:scroll-to-top";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    let frameId1: number;
    let frameId2: number;

    const scrollToTop = () => {
      frameId1 = requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent(SCROLL_TO_TOP_EVENT));
      });

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });

      frameId2 = requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    };

    scrollToTop();

    return () => {
      if (frameId1) cancelAnimationFrame(frameId1);
      if (frameId2) cancelAnimationFrame(frameId2);
    };
  }, [pathname]);

  return null;
}

export { SCROLL_TO_TOP_EVENT };
