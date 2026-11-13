export type NavTab = "Work" | "Explorations" | "Writing" | "Illustrations" | "Contact";

export const NAV_TABS: NavTab[] = [
  "Work",
  "Explorations",
  "Writing",
  "Illustrations",
  "Contact",
];

export function tabToPath(tab: NavTab): string {
  return `/${tab.toLowerCase()}`;
}

export function pathToTab(pathname: string): NavTab | null {
  const slug = pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  const matched = NAV_TABS.find((tab) => tab.toLowerCase() === slug);
  return matched ?? null;
}
