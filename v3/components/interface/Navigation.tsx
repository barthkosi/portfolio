"use client";

import Link from "next/link";
import {
  type MouseEvent,
  type Ref,
  useCallback,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Card } from "@/components/interface/Card";
import { InputField } from "@/components/interface/InputField";
import {
  type ContentCategory,
  type ContentIndex,
  formatPostYear,
  type PostMeta,
} from "@/lib/content-types";
import { type MediaItem } from "@/lib/media";
import { NAV_TABS, type NavTab, tabToPath } from "@/lib/navigation";
import { SOCIAL_LINKS } from "@/lib/site";

export type { NavTab };

export type NavigationHandle = {
  openTab: (tab: NavTab) => void;
};

const TABS = NAV_TABS;
const SOCIALS = SOCIAL_LINKS;
const MASONRY_GAP = 8;
const DESKTOP_MEDIA_QUERY = "(min-width: 48rem)";

function subscribeDesktopMedia(callback: () => void) {
  const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function getDesktopServerSnapshot() {
  return false;
}
const SKELETON_ASPECTS = [
  "aspect-[3/4]",
  "aspect-square",
  "aspect-[4/5]",
  "aspect-[16/10]",
  "aspect-[3/4]",
  "aspect-square",
];

const cachedMedia = new Map<string, MediaItem[]>();
const inFlightMedia = new Map<string, Promise<MediaItem[]>>();
const cachedCoverSizes = new Map<string, { width: number; height: number }>();
let cachedContentIndex: ContentIndex | null = null;
let inFlightContentIndex: Promise<ContentIndex> | null = null;

async function fetchContentIndex(): Promise<ContentIndex> {
  if (cachedContentIndex) return cachedContentIndex;
  if (!inFlightContentIndex) {
    inFlightContentIndex = fetch("/api/content", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load content (${res.status})`);
        }
        const data = (await res.json()) as ContentIndex;
        cachedContentIndex = data;
        return data;
      })
      .finally(() => {
        inFlightContentIndex = null;
      });
  }
  return inFlightContentIndex;
}

function ContentCategoryView({
  category,
  onNavigate,
}: {
  category: ContentCategory;
  onNavigate: () => void;
}) {
  const [fetchState, setFetchState] = useState<{
    index: ContentIndex | null;
    error: string | null;
  }>(() => ({
    index: cachedContentIndex,
    error: null,
  }));
  const [measuredSizes, setMeasuredSizes] = useState<
    Record<string, { width: number; height: number }>
  >(() => Object.fromEntries(cachedCoverSizes));
  const isDesktop = useSyncExternalStore(
    subscribeDesktopMedia,
    getDesktopSnapshot,
    getDesktopServerSnapshot,
  );

  useEffect(() => {
    if (cachedContentIndex) {
      return;
    }

    let active = true;
    fetchContentIndex()
      .then((index) => {
        if (active) {
          setFetchState({ index, error: null });
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setFetchState({
            index: null,
            error:
              err instanceof Error ? err.message : "Failed to load content",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const index = cachedContentIndex ?? fetchState.index;
  const error = index ? null : fetchState.error;
  const items = index ? (index[category] ?? []) : error ? [] : null;

  const handleImageLoad = useCallback(
    (id: string, dimensions: { width: number; height: number }) => {
      const existingCached = cachedCoverSizes.get(id);
      if (
        existingCached &&
        existingCached.width === dimensions.width &&
        existingCached.height === dimensions.height
      ) {
        return;
      }
      cachedCoverSizes.set(id, dimensions);
      setMeasuredSizes((prev) => {
        const existing = prev[id];
        if (
          existing &&
          existing.width === dimensions.width &&
          existing.height === dimensions.height
        ) {
          return prev;
        }
        return { ...prev, [id]: dimensions };
      });
    },
    [],
  );

  if (!items) {
    if (category === "writing") {
      return (
        <div className="relative flex w-full flex-col items-start gap-2">
          <Card variant="Horizontal" title="" year="" />
          <Card variant="Horizontal" title="" year="" />
        </div>
      );
    }
    return (
      <div className="relative flex w-full flex-col items-start gap-2 md:flex-row">
        <div className="relative flex w-full flex-col items-start justify-center gap-2 md:min-w-px md:flex-[1_0_0]">
          <Card variant="Default" aspectClass="aspect-[160/90]" title="" year="" />
          <Card variant="Default" aspectClass="aspect-[160/90]" title="" year="" />
        </div>
        <div className="relative flex w-full flex-col items-start justify-center gap-2 md:min-w-px md:flex-[1_0_0]">
          <Card variant="Default" aspectClass="aspect-[160/90]" title="" year="" />
          <Card variant="Default" aspectClass="aspect-[160/90]" title="" year="" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative w-full py-4">
        <p className="label-xs text-content-tertiary">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="relative w-full py-4">
        <p className="label-xs text-content-tertiary">No published items yet.</p>
      </div>
    );
  }

  if (category === "writing") {
    return (
      <div className="relative flex w-full flex-col items-start gap-2">
        {items.map((item) => {
          const cardTitle = item.cardTitle || item.title;
          const isLocked = Boolean(item.locked);
          return (
            <Card
              key={item.id}
              variant="Horizontal"
              title={cardTitle}
              year={isLocked ? "Coming soon" : formatPostYear(item.date)}
              image={item.coverImage ?? undefined}
              alt={cardTitle}
              href={isLocked ? undefined : `/${category}/${item.slug}`}
              onClick={isLocked ? undefined : onNavigate}
            />
          );
        })}
      </div>
    );
  }

  const getAspectStyle = (item: PostMeta) => {
    const size =
      measuredSizes[item.id] ??
      (item.coverWidth && item.coverHeight
        ? { width: item.coverWidth, height: item.coverHeight }
        : null);
    return {
      aspectRatio: size ? `${size.width} / ${size.height}` : "16 / 9",
    };
  };

  const renderCard = (item: PostMeta) => {
    const cardTitle = item.cardTitle || item.title;
    const isLocked = Boolean(item.locked);
    return (
      <Card
        key={item.id}
        variant="Default"
        style={getAspectStyle(item)}
        title={cardTitle}
        year={isLocked ? "Coming soon" : formatPostYear(item.date)}
        image={item.coverImage ?? undefined}
        alt={cardTitle}
        href={isLocked ? undefined : `/${category}/${item.slug}`}
        onClick={isLocked ? undefined : onNavigate}
        onImageLoad={
          item.coverWidth && item.coverHeight
            ? undefined
            : (dims) => handleImageLoad(item.id, dims)
        }
      />
    );
  };

  if (!isDesktop) {
    return (
      <div className="relative flex w-full flex-col items-start gap-2">
        {items.map(renderCard)}
      </div>
    );
  }

  const leftItems = items.filter((_, i) => i % 2 === 0);
  const rightItems = items.filter((_, i) => i % 2 === 1);

  return (
    <div className="relative flex w-full flex-row items-start gap-2">
      <div className="relative flex w-full min-w-px flex-[1_0_0] flex-col items-start justify-center gap-2">
        {leftItems.map(renderCard)}
      </div>
      <div className="relative flex w-full min-w-px flex-[1_0_0] flex-col items-start justify-center gap-2">
        {rightItems.map(renderCard)}
      </div>
    </div>
  );
}

async function fetchMediaFolder(folder: string): Promise<MediaItem[]> {
  const cached = cachedMedia.get(folder);
  if (cached) return cached;

  let pending = inFlightMedia.get(folder);
  if (!pending) {
    pending = fetch(`/api/media?folder=${encodeURIComponent(folder)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load media (${res.status})`);
        }
        const data = (await res.json()) as { items?: MediaItem[] };
        const items = data.items ?? [];
        cachedMedia.set(folder, items);
        return items;
      })
      .finally(() => {
        inFlightMedia.delete(folder);
      });
    inFlightMedia.set(folder, pending);
  }
  return pending;
}

function MediaMasonry({ folder }: { folder: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cachedItems = cachedMedia.get(folder) ?? null;
  const [fetchState, setFetchState] = useState<{
    folder: string;
    items: MediaItem[] | null;
    error: string | null;
  }>(() => ({
    folder,
    items: cachedItems,
    error: null,
  }));
  const [measuredSizes, setMeasuredSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [layout, setLayout] = useState<{ width: number; columns: number } | null>(
    null,
  );

  useEffect(() => {
    if (cachedMedia.has(folder)) {
      return;
    }

    let active = true;
    fetchMediaFolder(folder)
      .then((nextItems) => {
        if (active) {
          setFetchState({ folder, items: nextItems, error: null });
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setFetchState({
            folder,
            items: [],
            error: err instanceof Error ? err.message : "Failed to load media",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [folder]);

  const currentFetchState = fetchState.folder === folder ? fetchState : null;
  const error = cachedItems ? null : (currentFetchState?.error ?? null);
  const items = cachedItems ?? currentFetchState?.items ?? null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const width = container.clientWidth;
      if (width <= 0) return;
      const columns = window.innerWidth >= 768 ? 3 : 2;
      setLayout((prev) =>
        prev && prev.width === width && prev.columns === columns
          ? prev
          : { width, columns },
      );
    };

    const observer = new ResizeObserver(updateLayout);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleImageLoad = useCallback(
    (id: string, dimensions: { width: number; height: number }) => {
      setMeasuredSizes((prev) => {
        const existing = prev[id];
        if (
          existing &&
          existing.width === dimensions.width &&
          existing.height === dimensions.height
        ) {
          return prev;
        }
        return { ...prev, [id]: dimensions };
      });
    },
    [],
  );

  if (!items) {
    return (
      <div ref={containerRef} className="relative w-full">
        <div className="w-full columns-2 gap-2 md:columns-3">
          {SKELETON_ASPECTS.map((aspectClass, index) => (
            <div key={index} className="break-inside-avoid pb-2">
              <Card variant="Media" aspectClass={aspectClass} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div ref={containerRef} className="relative w-full py-4">
        <p className="label-xs text-content-tertiary">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div ref={containerRef} className="relative w-full py-4">
        <p className="label-xs text-content-tertiary">No media found.</p>
      </div>
    );
  }

  if (!layout) {
    return (
      <div ref={containerRef} className="relative w-full">
        <div className="w-full columns-2 gap-2 md:columns-3">
          {items.map((item) => {
            const size =
              measuredSizes[item.id] ??
              (item.width && item.height
                ? { width: item.width, height: item.height }
                : { width: 1, height: 1 });
            return (
              <div key={item.id} className="break-inside-avoid pb-2">
                <Card
                  variant="Media"
                  image={item.src}
                  alt={item.alt}
                  style={{ aspectRatio: `${size.width} / ${size.height}` }}
                  onImageLoad={(dims) => handleImageLoad(item.id, dims)}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const colWidth =
    (layout.width - MASONRY_GAP * (layout.columns - 1)) / layout.columns;
  const colHeights = new Array<number>(layout.columns).fill(0);
  const positioned = items.map((item) => {
    let targetCol = 0;
    for (let i = 1; i < layout.columns; i += 1) {
      if (colHeights[i] < colHeights[targetCol]) {
        targetCol = i;
      }
    }
    const size =
      measuredSizes[item.id] ??
      (item.width && item.height
        ? { width: item.width, height: item.height }
        : { width: 1, height: 1 });
    const itemHeight = colWidth * (size.height / size.width);
    const x = targetCol * (colWidth + MASONRY_GAP);
    const y = colHeights[targetCol];
    colHeights[targetCol] = y + itemHeight + MASONRY_GAP;
    return { item, x, y, itemHeight };
  });
  const totalHeight = Math.max(0, Math.max(...colHeights) - MASONRY_GAP);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative w-full" style={{ height: totalHeight }}>
        {positioned.map(({ item, x, y, itemHeight }) => (
          <div
            key={item.id}
            className="absolute top-0 left-0"
            style={{
              width: colWidth,
              height: itemHeight,
              transform: `translate3d(${x}px, ${y}px, 0)`,
            }}
          >
            <Card
              variant="Media"
              image={item.src}
              alt={item.alt}
              className="h-full"
              onImageLoad={
                item.width && item.height
                  ? undefined
                  : (dims) => handleImageLoad(item.id, dims)
              }
            />
          </div>
        ))}
      </div>
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
    <nav
      aria-label="Primary"
      className="relative flex w-full shrink-0 flex-col items-start gap-0"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onSelect(tab)}
            className={`relative flex w-full shrink-0 cursor-pointer items-center justify-between gap-0 rounded-[4px] p-2 text-left ${
              isActive ? "md:bg-background-tertiary" : ""
            }`}
          >
            <span
              className={`label-md md:label-sm h-fit w-fit shrink-0 whitespace-nowrap ${
                isActive
                  ? "text-content-primary"
                  : "text-content-primary md:text-content-secondary"
              }`}
            >
              {tab}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function SocialLinks() {
  return (
    <nav
      aria-label="Socials"
      className="relative flex shrink-0 flex-col items-start gap-2 p-2"
    >
      <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-tertiary uppercase opacity-60">
        Socials
      </p>
      <ul className="relative flex shrink-0 list-none flex-col items-start gap-2 md:gap-1">
        {SOCIALS.map((item) => (
          <li key={item.label} className="relative flex shrink-0 items-start gap-0">
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="label-sm md:label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-secondary"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TabContent({
  activeTab,
  onNavigate,
  formState,
  onFieldChange,
  onCopyEmail,
  copied,
}: {
  activeTab: NavTab;
  onNavigate: () => void;
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
  if (activeTab === "Work") {
    return <ContentCategoryView key="work" category="work" onNavigate={onNavigate} />;
  }

  if (activeTab === "Explorations") {
    return (
      <ContentCategoryView
        key="explorations"
        category="explorations"
        onNavigate={onNavigate}
      />
    );
  }

  if (activeTab === "Writing") {
    return (
      <ContentCategoryView
        key="writing"
        category="writing"
        onNavigate={onNavigate}
      />
    );
  }

  if (activeTab === "Illustrations") {
    return <MediaMasonry key="illustrations" folder="illustrations" />;
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
        <span aria-hidden="true" className="relative block size-5 shrink-0">
          <img src="/images/copy.svg" alt="" className="block size-full" />
        </span>
      </button>
    </form>
  );
}

export function Navigation({
  ref,
  initialTab = "Work",
  initialOpen = false,
  syncUrl = false,
}: {
  ref?: Ref<NavigationHandle>;
  initialTab?: NavTab;
  initialOpen?: boolean;
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
  const navRef = useRef<HTMLElement>(null);

  const replacePath = useCallback(
    (path: string) => {
      if (!syncUrl || typeof window === "undefined") return;
      if (window.location.pathname !== path) {
        window.history.replaceState(null, "", path);
      }
    },
    [syncUrl],
  );

  const onAppScroll = useEffectEvent((currentY: number) => {
    if (isOpen) return;
    if (currentY > lastScrollY.current && currentY > 16) {
      setIsSmall(true);
    } else if (currentY < lastScrollY.current || currentY <= 16) {
      setIsSmall(false);
    }
    lastScrollY.current = currentY;
  });

  useEffect(() => {
    const scrollTarget = document.getElementById("app-scroll");
    const getScrollY = () => (scrollTarget ? scrollTarget.scrollTop : window.scrollY);
    lastScrollY.current = getScrollY();

    const handleScroll = () => {
      onAppScroll(getScrollY());
    };

    const listenerTarget: EventTarget = scrollTarget ?? window;
    listenerTarget.addEventListener("scroll", handleScroll, { passive: true });
    return () => listenerTarget.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const scrollTarget = document.getElementById("app-scroll");
    if (!scrollTarget) {
      const prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = prevOverflow;
      };
    }

    const prevOverflowY = scrollTarget.style.overflowY;
    const prevPaddingRight = scrollTarget.style.paddingRight;
    const savedScrollTop = scrollTarget.scrollTop;
    const gutterBefore = scrollTarget.offsetWidth - scrollTarget.clientWidth;

    scrollTarget.style.overflowY = "hidden";

    const gutterAfter = scrollTarget.offsetWidth - scrollTarget.clientWidth;
    const gutterDiff = gutterBefore - gutterAfter;
    if (gutterDiff > 0) {
      const computedPaddingRight =
        Number.parseFloat(getComputedStyle(scrollTarget).paddingRight) || 0;
      scrollTarget.style.paddingRight = `${computedPaddingRight + gutterDiff}px`;
    }

    if (scrollTarget.scrollTop !== savedScrollTop) {
      scrollTarget.scrollTop = savedScrollTop;
    }

    return () => {
      const currentScrollTop = scrollTarget.scrollTop;
      scrollTarget.style.overflowY = prevOverflowY;
      scrollTarget.style.paddingRight = prevPaddingRight;
      if (scrollTarget.scrollTop !== currentScrollTop) {
        scrollTarget.scrollTop = currentScrollTop;
      }
      lastScrollY.current = scrollTarget.scrollTop;
    };
  }, [isOpen]);

  useImperativeHandle(
    ref,
    () => ({
      openTab: (tab: NavTab) => {
        setIsOpen(true);
        setActiveTab(tab);
        setMobileView("tab");
        setHasScrolledContent(false);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
        replacePath(tabToPath(tab));
      },
    }),
    [replacePath],
  );

  const onDismiss = useEffectEvent(() => {
    setIsOpen(false);
    replacePath("/");
  });

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        onDismiss();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (
          document.activeElement instanceof HTMLElement &&
          navRef.current?.contains(document.activeElement)
        ) {
          document.activeElement.blur();
        }
        onDismiss();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggleOpen = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      setMobileView("menu");
      setHasScrolledContent(false);
      replacePath(tabToPath(activeTab));
    } else {
      replacePath("/");
    }
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileView("tab");
    setHasScrolledContent(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    replacePath(tabToPath(tab));
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

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      syncUrl &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      event.button === 0
    ) {
      event.preventDefault();
      setIsOpen(false);
      replacePath("/");
      return;
    }
    setIsOpen(false);
  };

  const widthClass = isOpen
    ? "left-4 right-4 h-[calc(100dvh-32px-env(safe-area-inset-bottom,0px))] bg-background-secondary md:left-1/2 md:right-auto md:h-[80dvh] md:w-[calc(100vw-64px)] md:-translate-x-1/2 lg:w-[800px]"
    : isSmall
      ? "left-4 right-4 h-[52px] bg-background-tertiary backdrop-blur-[2px] md:left-1/2 md:right-auto md:w-[360px] md:-translate-x-1/2"
      : "left-4 right-4 h-[52px] bg-background-tertiary backdrop-blur-[2px] md:left-1/2 md:right-auto md:w-[calc(100vw-64px)] md:-translate-x-1/2 lg:w-[800px]";

  return (
    <header
      ref={navRef}
      className={`fixed top-4 z-50 flex flex-col items-end gap-[44px] overflow-clip rounded-[12px] p-2 transition-nav-shell ${widthClass}`}
    >
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isOpen}
        className="relative flex h-fit w-fit shrink-0 cursor-pointer flex-row items-center gap-2 p-2 outline-none"
      >
        <span
          aria-hidden="true"
          className="relative block size-5 shrink-0 overflow-clip"
        >
          <span className="absolute top-[9.25px] left-[4px] h-[1.5px] w-[12px] rounded-full bg-background-base-inverse" />
          <span
            className={`absolute top-[9.25px] left-[4px] h-[1.5px] w-[12px] rounded-full bg-background-base-inverse transition-nav-icon ${
              isOpen ? "rotate-0" : "-rotate-90"
            }`}
          />
        </span>
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

          <section
            aria-label={activeTab}
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
              <span aria-hidden="true" className="relative block size-5 shrink-0">
                <img src="/images/chevron-left.svg" alt="" className="block size-full" />
              </span>
            </button>
            <div className="relative -mb-2 min-h-0 w-full flex-1">
              {hasScrolledContent && (
                <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-8 bg-gradient-to-b from-background-secondary to-background-secondary/0" />
              )}
              <div
                ref={scrollContainerRef}
                onScroll={(e) => setHasScrolledContent(e.currentTarget.scrollTop > 0)}
                className="nav-scrollbar h-full w-full touch-pan-y overflow-y-auto overscroll-y-contain pb-2"
              >
                <TabContent
                  activeTab={activeTab}
                  onNavigate={() => setIsOpen(false)}
                  formState={formState}
                  onFieldChange={handleFieldChange}
                  onCopyEmail={handleCopyEmail}
                  copied={copied}
                />
              </div>
            </div>
          </section>
        </div>
      )}

      <Link
        href="/"
        aria-label="Barth Home"
        onClick={handleLogoClick}
        className="absolute top-[5px] left-[-32px] z-10 flex size-[71.36px] cursor-pointer items-center justify-center outline-none"
      >
        <span aria-hidden="true" className="block -rotate-12 flex-none">
          <span className="relative block size-[60.165px]">
            <img
              src="/images/nav-logo.svg"
              alt=""
              className="pointer-events-none block size-full"
            />
          </span>
        </span>
      </Link>
    </header>
  );
}
