"use client";

import { useCallback, useRef, useState } from "react";
import { AvatarIntro } from "@/components/AvatarIntro";
import { Barth } from "@/components/Barth";
import { Navigation } from "@/components/Navigation";

export default function Home() {
  const [hasEntered, setHasEntered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const slotRef = useRef<HTMLButtonElement>(null);

  const handleIntroComplete = useCallback(() => {
    setHasEntered(true);
    setIsExpanded(false);
  }, []);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center gap-0 overflow-clip bg-background-primary p-4">
      <div className="relative flex w-full shrink-0 flex-col items-center gap-8 px-1 md:max-w-[360px]">
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
          <div
            className={`relative flex w-full shrink-0 flex-col items-start gap-5 transition-opacity duration-500 ${
              isExpanded ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            <p className="body-sm w-full shrink-0 text-center text-pretty text-content-primary">
              Barth is a design engineer building  beautiful and intuitive digital products.
            </p>
            <p className="body-sm w-full shrink-0 text-center text-pretty text-content-primary">
              He has 4+ years of experience and has worked with businesses and studios building interesting products.
            </p>
          </div>
        </div>
        <div
          className={`relative flex h-fit w-fit shrink-0 flex-row items-start justify-center gap-8 transition-opacity duration-500 ${
            isExpanded ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <p className="label-md h-fit w-fit shrink-0 whitespace-nowrap text-center text-content-tertiary">
            Work
          </p>
          <p className="label-md h-fit w-fit shrink-0 whitespace-nowrap text-center text-content-tertiary">
            Writing
          </p>
        </div>
      </div>
      <div
        className={`transition-opacity duration-500 ${
          hasEntered ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <Navigation />
        <Barth />
      </div>
      <AvatarIntro
        slotRef={slotRef}
        isExpanded={isExpanded}
        onIntroComplete={handleIntroComplete}
        onCollapse={handleCollapse}
      />
    </div>
  );
}
