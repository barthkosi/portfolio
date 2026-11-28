"use client";

import { type TransitionEvent, useCallback, useEffect, useRef, useState } from "react";
import { AvatarIntro } from "@/components/interface/AvatarIntro";
import { Barth } from "@/components/interface/Barth";
import { HeatText } from "@/components/interface/HeatText";
import {
  Navigation,
  type NavigationHandle,
  type NavTab,
} from "@/components/interface/Navigation";

const QUICK_LINKS_FADE_FALLBACK_MS = 550;

export function HomeClient({ initialTab }: { initialTab?: NavTab }) {
  const [hasEntered, setHasEntered] = useState(Boolean(initialTab));
  const [isExpanded, setIsExpanded] = useState(!initialTab);
  const [isDocked, setIsDocked] = useState(Boolean(initialTab));
  const [hasRevealedText, setHasRevealedText] = useState(Boolean(initialTab));
  const slotRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<NavigationHandle>(null);

  const handleIntroComplete = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const handleDockComplete = useCallback(() => {
    setIsDocked(true);
  }, []);

  const handleRevealComplete = useCallback(() => {
    setHasRevealedText(true);
  }, []);

  const handleQuickLinksTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLElement>) => {
      if (
        event.target === event.currentTarget &&
        event.propertyName === "opacity" &&
        hasRevealedText
      ) {
        setHasEntered(true);
      }
    },
    [hasRevealedText],
  );

  useEffect(() => {
    if (!hasRevealedText || hasEntered) return;
    const timerId = window.setTimeout(() => {
      setHasEntered(true);
    }, QUICK_LINKS_FADE_FALLBACK_MS);
    return () => window.clearTimeout(timerId);
  }, [hasRevealedText, hasEntered]);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
    setIsDocked(false);
    setHasRevealedText(false);
  }, []);

  const handleOpenTab = useCallback((tab: NavTab) => {
    setHasEntered(true);
    navigationRef.current?.openTab(tab);
  }, []);

  return (
    <div className="relative flex min-h-full w-full flex-col items-center justify-center gap-0 overflow-clip bg-background-primary p-4">
      <main className="relative z-10 flex w-full shrink-0 flex-col items-center gap-8 px-1 md:max-w-[360px]">
        <div className="relative flex w-full shrink-0 flex-col items-center gap-4">
          <button
            ref={slotRef}
            type="button"
            onClick={handleExpand}
            aria-label="Expand 3D avatar"
            className={`relative h-16 w-16 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content-tertiary ${
              isExpanded ? "pointer-events-none" : "cursor-pointer"
            }`}
          />
          <HeatText
            disabled={isExpanded}
            revealed={isDocked}
            onRevealComplete={handleRevealComplete}
            className="relative w-full shrink-0"
            contentClassName="flex w-full flex-col items-start gap-5"
          >
            <h1 className="body-sm w-full shrink-0 text-center text-pretty text-content-primary">
              Barth is a design engineer building  beautiful and intuitive digital products.
            </h1>
            <p className="body-sm w-full shrink-0 text-center text-pretty text-content-primary">
              He has 4+ years of experience and has worked with businesses and studios building intuitive products.
            </p>
          </HeatText>
        </div>
        <nav
          aria-label="Quick links"
          onTransitionEnd={handleQuickLinksTransitionEnd}
          className={`relative flex h-fit w-fit shrink-0 flex-row items-start justify-center gap-8 transition-home-fade ${
            hasRevealedText ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <button
            type="button"
            onClick={() => handleOpenTab("Work")}
            className="label-md h-fit w-fit shrink-0 cursor-pointer whitespace-nowrap text-center text-content-tertiary transition-colors hover:text-content-primary"
          >
            Work
          </button>
          <button
            type="button"
            onClick={() => handleOpenTab("Writing")}
            className="label-md h-fit w-fit shrink-0 cursor-pointer whitespace-nowrap text-center text-content-tertiary transition-colors hover:text-content-primary"
          >
            Writing
          </button>
        </nav>
      </main>
      <div
        className={`transition-home-fade ${
          hasEntered ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <Navigation
          ref={navigationRef}
          initialTab={initialTab}
          initialOpen={Boolean(initialTab)}
          syncUrl
        />
        <Barth />
      </div>
      <AvatarIntro
        slotRef={slotRef}
        isExpanded={isExpanded}
        skipIntro={Boolean(initialTab)}
        onIntroComplete={handleIntroComplete}
        onCollapse={handleCollapse}
        onDockComplete={handleDockComplete}
      />
    </div>
  );
}
