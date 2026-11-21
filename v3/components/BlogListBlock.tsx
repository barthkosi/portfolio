import type { ReactNode } from "react";

type BlogListBlockProps = {
  variant: "bullet" | "numbered";
  items: ReactNode[];
  className?: string;
};

export function BlogListBlock({
  variant,
  items,
  className,
}: BlogListBlockProps) {
  if (items.length === 0) return null;

  if (variant === "numbered") {
    return (
      <ol
        className={
          className ??
          "relative flex w-full shrink-0 list-decimal flex-col items-start justify-start gap-1 pt-3 pl-[38.5px]"
        }
      >
        {items.map((item, index) => (
          <li
            key={index}
            className="body-sm w-full shrink-0 text-pretty text-content-secondary"
          >
            {item}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul
      className={
        className ??
        "relative flex w-full shrink-0 list-disc flex-col items-start justify-start gap-1 pt-3 pl-[38.5px]"
      }
    >
      {items.map((item, index) => (
        <li
          key={index}
          className="body-sm w-full shrink-0 text-pretty text-content-secondary"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
