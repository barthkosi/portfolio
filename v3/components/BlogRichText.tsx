import type { AnchorHTMLAttributes, ReactNode } from "react";

export function BlogBold({ children }: { children: ReactNode }) {
  return <strong className="font-bold text-content-primary">{children}</strong>;
}

export function BlogItalic({ children }: { children: ReactNode }) {
  return <em className="italic">{children}</em>;
}

export function BlogLink({
  children,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  return (
    <a
      className={
        className ??
        "text-content-brand decoration-solid [text-underline-position:from-font] hover:underline"
      }
      {...props}
    >
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
