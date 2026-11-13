export const DEFAULT_THEME_TOKEN = "--background-primary";
export const DEFAULT_THEME_COLOR = "#0A0A0A";

export function getThemeColor(token: string = DEFAULT_THEME_TOKEN): string {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_COLOR;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();

  return value || DEFAULT_THEME_COLOR;
}

export function setPageThemeColor(colorOrToken: string = DEFAULT_THEME_TOKEN): string {
  const resolved = colorOrToken.startsWith("--")
    ? getThemeColor(colorOrToken)
    : colorOrToken;

  if (typeof document === "undefined") {
    return resolved;
  }

  document.documentElement.style.backgroundColor = resolved;

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = resolved;

  return resolved;
}
