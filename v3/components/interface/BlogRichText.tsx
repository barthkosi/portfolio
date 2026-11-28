import type { AnchorHTMLAttributes, ReactNode } from "react";
import { TransitionLink } from "@/components/interface/PageTransition";

export function BlogBold({ children }: { children: ReactNode }) {
  return <strong className="font-bold text-content-primary">{children}</strong>;
}

export function BlogItalic({ children }: { children: ReactNode }) {
  return <em className="italic">{children}</em>;
}

export function BlogLink({
  children,
  className,
  href,
  target,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  const linkClassName =
    className ??
    "underline decoration-solid [text-underline-position:from-font] transition-colors hover:text-content-brand";

  if (
    href &&
    href.startsWith("/") &&
    !href.startsWith("//") &&
    (!target || target === "_self")
  ) {
    return (
      <TransitionLink
        href={href}
        target={target}
        className={linkClassName}
        {...props}
      >
        {children}
      </TransitionLink>
    );
  }

  return (
    <a href={href} target={target} className={linkClassName} {...props}>
      {children}
    </a>
  );
}

export function BlogStrikethrough({ children }: { children: ReactNode }) {
  return (
    <s className="line-through decoration-solid [text-decoration-skip-ink:none] [text-underline-position:from-font]">
      {children}
    </s>
  );
}

export function BlogInlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="body-sm inline-flex h-fit w-fit items-center justify-center gap-0 rounded-[6px] border border-border-subtle bg-background-base-tertiary px-1 py-0 text-content-secondary">
      {children}
    </code>
  );
}
