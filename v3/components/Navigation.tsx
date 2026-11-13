"use client";

import { useEffect, useRef, useState } from "react";
import { InputField } from "@/components/InputField";
import { NAV_TABS, type NavTab, pathToTab, tabToPath } from "@/lib/navigation";

export type { NavTab };

const TABS = NAV_TABS;
const SOCIALS = ["X (Twitter)", "Github", "Cosmos", "Instagram"];

function NavCard({
  aspectClass,
  orientation = "Vertical",
  showMeta = false,
  title = "Title",
  year = "2026",
}: {
  aspectClass?: string;
  orientation?: "Vertical" | "Horizontal";
  showMeta?: boolean;
  title?: string;
  year?: string;
}) {
  if (orientation === "Horizontal") {
    return (
      <div className="relative flex w-full shrink-0 items-center gap-0 rounded-[4px]">
        <div className="relative aspect-[71.11111450195312/40] max-h-[54px] max-w-[96px] min-w-px flex-[1_0_0] rounded-[4px] bg-background-tertiary" />
        <div className="relative flex min-w-px flex-[1_0_0] flex-col items-start gap-1.5 px-2 py-1">
          <p className="label-md h-fit w-fit shrink-0 whitespace-nowrap text-content-primary">
            {title}
          </p>
          <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-tertiary">
            {year}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex w-full shrink-0 flex-col items-start gap-0 rounded-[4px] bg-background-tertiary ${aspectClass || ""}`}
    >
      <div className="relative min-h-px w-full flex-[1_0_0] rounded-t-[4px] bg-background-tertiary" />
      {showMeta && (
        <div className="relative flex w-full shrink-0 items-center justify-between gap-0 px-2 py-1">
          <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-primary">
            {title}
          </p>
          <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-tertiary">
            {year}
          </p>
        </div>
      )}
    </div>
  );
}

function PagesList({
  activeTab,
  onSelect,
}: {
  activeTab: NavTab;
  onSelect: (tab: NavTab) => void;
}) {
  return (
    <div className="relative flex w-full shrink-0 flex-col items-start gap-0">
      {TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onSelect(tab)}
            className={`relative flex w-full shrink-0 cursor-pointer items-center justify-between gap-0 rounded-[4px] p-2 text-left ${
              isActive ? "bg-background-tertiary" : ""
            }`}
          >
            <span
              className={`label-sm h-fit w-fit shrink-0 whitespace-nowrap ${
                isActive ? "text-content-primary" : "text-content-secondary"
              }`}
            >
              {tab}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SocialLinks() {
  return (
    <div className="relative flex shrink-0 flex-col items-start gap-2 p-2">
      <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-tertiary uppercase opacity-60">
        Socials
      </p>
      <div className="relative flex shrink-0 flex-col items-start gap-1">
        {SOCIALS.map((item) => (
          <div key={item} className="relative flex shrink-0 items-start gap-0">
            <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-secondary">
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabContent({
  activeTab,
  formState,
  onFieldChange,
  onCopyEmail,
  copied,
}: {
  activeTab: NavTab;
  formState: {
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    message: string;
  };
  onFieldChange: (field: keyof typeof formState, value: string) => void;
  onCopyEmail: () => void;
  copied: boolean;
}) {
  if (activeTab === "Work" || activeTab === "Explorations") {
    return (
      <div className="relative flex w-full flex-col items-start gap-2 md:flex-row">
        <div className="relative flex w-full flex-col items-start justify-center gap-2 md:min-w-px md:flex-[1_0_0]">
          <NavCard aspectClass="aspect-[160/90]" showMeta />
          <NavCard aspectClass="aspect-[472/472]" />
          <NavCard aspectClass="aspect-[160/90]" />
        </div>
        <div className="relative flex w-full flex-col items-start justify-center gap-2 md:min-w-px md:flex-[1_0_0]">
          <NavCard aspectClass="aspect-[472/590]" />
          <NavCard aspectClass="aspect-[160/90]" />
        </div>
      </div>
    );
  }

  if (activeTab === "Writing") {
    return (
      <div className="relative flex w-full flex-col items-start gap-2">
        <NavCard orientation="Horizontal" />
        <NavCard orientation="Horizontal" />
      </div>
    );
  }

  if (activeTab === "Illustrations") {
    return (
      <div className="relative flex w-full flex-col items-start gap-2 md:flex-row">
        <div className="relative flex w-full flex-col items-start justify-center gap-2 md:min-w-px md:flex-[1_0_0]">
          <NavCard aspectClass="aspect-[472/472]" />
          <NavCard aspectClass="aspect-[160/90]" />
          <NavCard aspectClass="aspect-[472/472]" />
        </div>
        <div className="relative flex w-full flex-col items-start justify-center gap-2 md:min-w-px md:flex-[1_0_0]">
          <NavCard aspectClass="aspect-[472/590]" />
          <NavCard aspectClass="aspect-[472/590]" />
          <NavCard aspectClass="aspect-[160/90]" />
        </div>
        <div className="relative flex w-full flex-col items-start justify-center gap-2 md:min-w-px md:flex-[1_0_0]">
          <NavCard aspectClass="aspect-[160/90]" />
          <NavCard aspectClass="aspect-[472/590]" />
          <NavCard aspectClass="aspect-[160/90]" />
          <NavCard aspectClass="aspect-[160/90]" />
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="relative flex min-h-full w-full flex-col items-end justify-between gap-4"
    >
      <div className="relative flex w-full shrink-0 flex-col items-start gap-4">
        <div className="relative flex w-full shrink-0 flex-col items-start gap-3">
          <div className="relative flex w-full shrink-0 items-center gap-3">
            <InputField
              className="relative flex min-w-px flex-[1_0_0] flex-col items-start gap-2"
              title="First Name"
              name="firstName"
              value={formState.firstName}
              onChange={(v) => onFieldChange("firstName", v)}
            />
            <InputField
              className="relative flex min-w-px flex-[1_0_0] flex-col items-start gap-2"
              title="Last Name"
              name="lastName"
              value={formState.lastName}
              onChange={(v) => onFieldChange("lastName", v)}
            />
          </div>
          <div className="relative flex w-full shrink-0 items-center gap-3">
            <InputField
              className="relative flex min-w-px flex-[1_0_0] flex-col items-start gap-2"
              title="Company"
              name="company"
              value={formState.company}
              onChange={(v) => onFieldChange("company", v)}
            />
            <InputField
              className="relative flex min-w-px flex-[1_0_0] flex-col items-start gap-2"
              title="Email"
              name="email"
              type="email"
              value={formState.email}
              onChange={(v) => onFieldChange("email", v)}
            />
          </div>
          <InputField
            className="relative flex w-full shrink-0 flex-col items-start gap-2"
            size="Large"
            title="Message"
            name="message"
            value={formState.message}
            onChange={(v) => onFieldChange("message", v)}
          />
        </div>
        <button
          type="submit"
          className="label-sm relative flex shrink-0 cursor-pointer items-center justify-center gap-0 rounded-[8px] border border-border-default bg-background-inverse px-5 py-1.5 text-content-inverse"
        >
          Send
        </button>
      </div>
      <button
        type="button"
        onClick={onCopyEmail}
        className="relative flex shrink-0 cursor-pointer items-center gap-2 p-2"
      >
        <span className="body-sm h-fit w-fit shrink-0 whitespace-nowrap text-content-secondary">
          {copied ? "Copied" : "hey@barthkosi.com"}
        </span>
        <span className="relative size-5 shrink-0">
          <img src="/images/copy.svg" alt="" className="block size-full" />
        </span>
      </button>
    </form>
  );
}

export function Navigation({
  initialTab = "Work",
  initialOpen = false,
  openRequest = null,
  syncUrl = false,
}: {
  initialTab?: NavTab;
  initialOpen?: boolean;
  openRequest?: { tab: NavTab; nonce: number } | null;
  syncUrl?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isSmall, setIsSmall] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>(initialTab);
  const [mobileView, setMobileView] = useState<"menu" | "tab">(initialOpen ? "tab" : "menu");
  const [copied, setCopied] = useState(false);
  const [hasScrolledContent, setHasScrolledContent] = useState(false);
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    company: "",
    email: "",
    message: "",
  });

  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const pushPath = (path: string) => {
    if (!syncUrl || typeof window === "undefined") return;
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
  };

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 16) {
        setIsSmall(true);
      } else if (currentY < lastScrollY.current || currentY <= 16) {
        setIsSmall(false);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!openRequest) return;
    setIsOpen(true);
    setActiveTab(openRequest.tab);
    setMobileView("tab");
    setHasScrolledContent(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    pushPath(tabToPath(openRequest.tab));
  }, [openRequest]);

  useEffect(() => {
    if (!syncUrl) return;
    const handlePopState = () => {
      const matched = pathToTab(window.location.pathname);
      if (matched) {
        setIsOpen(true);
        setActiveTab(matched);
        setMobileView("tab");
        setHasScrolledContent(false);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      } else {
        setIsOpen(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [syncUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        pushPath("/");
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, syncUrl]);

  const handleToggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setMobileView("menu");
      setHasScrolledContent(false);
      pushPath(tabToPath(activeTab));
    } else {
      pushPath("/");
    }
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileView("tab");
    setHasScrolledContent(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    pushPath(tabToPath(tab));
  };

  const handleFieldChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText("hey@barthkosi.com");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const widthClass = isOpen
    ? "left-4 right-4 h-[calc(100dvh-32px)] bg-background-secondary md:left-1/2 md:right-auto md:h-[80dvh] md:w-[calc(100vw-64px)] md:-translate-x-1/2 lg:w-[800px]"
    : isSmall
      ? "left-4 right-4 h-[52px] bg-background-tertiary backdrop-blur-[2px] md:left-1/2 md:right-auto md:w-[360px] md:-translate-x-1/2"
      : "left-4 right-4 h-[52px] bg-background-tertiary backdrop-blur-[2px] md:left-1/2 md:right-auto md:w-[calc(100vw-64px)] md:-translate-x-1/2 lg:w-[800px]";

  return (
    <div
      ref={navRef}
      className={`fixed top-4 z-50 flex flex-col items-end gap-[44px] overflow-clip rounded-[12px] p-2 transition-[width,height,background-color] duration-[250ms] ease-[cubic-bezier(0.43,0.07,0.59,0.94)] ${widthClass}`}
    >
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        className="relative flex h-fit w-fit shrink-0 cursor-pointer flex-row items-center gap-0 p-2"
      >
        <div className="relative size-5 shrink-0">
          <img src="/images/nav-minus.svg" alt="" className="block size-full" />
        </div>
      </button>

      {isOpen && (
        <div className="nav-fade-in relative flex min-h-0 w-full flex-1 flex-col items-start gap-5 md:grid md:grid-cols-8 md:grid-rows-[minmax(0,1fr)] md:items-stretch md:gap-3">
          <div
            className={`${
              mobileView === "menu" ? "flex" : "hidden"
            } w-full flex-1 flex-col items-start justify-between gap-6 md:col-span-2 md:flex md:h-full md:min-h-0 md:justify-between`}
          >
            <PagesList activeTab={activeTab} onSelect={handleSelectTab} />
            <SocialLinks />
          </div>

          <div
            className={`${
              mobileView === "tab" ? "flex" : "hidden"
            } min-h-0 w-full flex-1 flex-col items-start gap-5 md:col-span-6 md:flex md:h-full md:min-h-0`}
          >
            <button
              type="button"
              onClick={() => {
                setMobileView("menu");
                setHasScrolledContent(false);
              }}
              aria-label="Back to menu"
              className="flex shrink-0 cursor-pointer flex-col items-start gap-0 overflow-clip rounded-[12px] bg-background-tertiary p-2 backdrop-blur-[3px] md:hidden"
            >
              <div className="relative size-5 shrink-0">
                <img src="/images/chevron-left.svg" alt="" className="block size-full" />
              </div>
            </button>
            <div className="relative -mb-2 min-h-0 w-full flex-1">
              {hasScrolledContent && (
                <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-8 bg-gradient-to-b from-background-secondary to-background-secondary/0" />
              )}
              <div
                ref={scrollContainerRef}
                onScroll={(e) => setHasScrolledContent(e.currentTarget.scrollTop > 0)}
                className="nav-scrollbar h-full w-full overflow-y-auto pb-2"
              >
                <TabContent
                  activeTab={activeTab}
                  formState={formState}
                  onFieldChange={handleFieldChange}
                  onCopyEmail={handleCopyEmail}
                  copied={copied}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute top-[5px] left-[-32px] flex size-[71.36px] items-center justify-center">
        <div className="-rotate-12 flex-none">
          <div className="relative size-[60.165px]">
            <img src="/images/nav-logo.svg" alt="" className="block size-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
