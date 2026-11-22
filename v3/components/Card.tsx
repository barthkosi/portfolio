import Link from "next/link";
import type { CSSProperties } from "react";

export type CardVariant = "Default" | "Media" | "Horizontal";

type CardProps = {
  variant?: CardVariant;
  aspectClass?: string;
  title?: string;
  year?: string;
  image?: string;
  alt?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  onImageLoad?: (dimensions: { width: number; height: number }) => void;
};

function CardMeta({
  title,
  year,
  className,
}: {
  title: string;
  year: string;
  className?: string;
}) {
  return (
    <div
      className={`flex w-full items-center justify-between gap-2 px-2 ${className || ""}`}
    >
      <p className="label-xs h-fit w-fit min-w-0 truncate text-content-primary">
        {title}
      </p>
      <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-tertiary">
        {year}
      </p>
    </div>
  );
}

export function Card({
  variant = "Default",
  aspectClass,
  title = "Title",
  year = "2026",
  image,
  alt,
  href,
  onClick,
  className,
  style,
  onImageLoad,
}: CardProps) {
  const wrapIfLink = (content: React.ReactNode) => {
    if (!href) return content;
    return (
      <Link
        href={href}
        onClick={onClick}
        className="block w-full shrink-0"
      >
        {content}
      </Link>
    );
  };

  if (variant === "Horizontal") {
    return wrapIfLink(
      <div
        style={style}
        className={`relative flex w-full shrink-0 items-center gap-0 rounded-[4px] ${className || ""}`}
      >
        <div className="relative aspect-[71.11111450195312/40] max-h-[54px] max-w-[96px] min-w-px flex-[1_0_0] overflow-hidden rounded-[4px] bg-background-tertiary">
          {image && (
            <img
              src={image}
              alt={alt ?? title}
              decoding="async"
              className="pointer-events-none block size-full object-cover"
            />
          )}
        </div>
        <div className="relative flex min-w-px flex-[1_0_0] flex-col items-start gap-1.5 px-2 py-1">
          <p className="label-md h-fit w-fit max-w-full shrink-0 truncate whitespace-nowrap text-content-primary">
            {title}
          </p>
          <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-tertiary">
            {year}
          </p>
        </div>
      </div>,
    );
  }

  if (variant === "Media") {
    return wrapIfLink(
      <div
        style={style}
        className={`relative w-full shrink-0 overflow-hidden rounded-[4px] bg-background-tertiary ${aspectClass || ""} ${className || ""}`}
      >
        {image && (
          <img
            src={image}
            alt={alt ?? ""}
            decoding="async"
            onLoad={
              onImageLoad
                ? (event) => {
                    const { naturalWidth, naturalHeight } = event.currentTarget;
                    if (naturalWidth > 0 && naturalHeight > 0) {
                      onImageLoad({
                        width: naturalWidth,
                        height: naturalHeight,
                      });
                    }
                  }
                : undefined
            }
            className="pointer-events-none block size-full object-cover"
          />
        )}
      </div>,
    );
  }

  const innerAspectStyle = style?.aspectRatio
    ? { aspectRatio: style.aspectRatio }
    : undefined;

  return wrapIfLink(
    <div
      style={style}
      className={`group relative flex w-full shrink-0 flex-col items-start gap-0 overflow-hidden rounded-[4px] bg-background-tertiary ${aspectClass || ""} ${className || ""}`}
    >
      <div className="relative min-h-px w-full flex-[1_0_0] overflow-hidden rounded-t-[4px] bg-background-tertiary">
        {image && (
          <div
            style={innerAspectStyle}
            className={`pointer-events-none absolute top-0 left-0 w-full ${
              innerAspectStyle ? "" : aspectClass || "h-full"
            }`}
          >
            <img
              src={image}
              alt={alt ?? title}
              decoding="async"
              onLoad={
                onImageLoad
                  ? (event) => {
                      const { naturalWidth, naturalHeight } = event.currentTarget;
                      if (naturalWidth > 0 && naturalHeight > 0) {
                        onImageLoad({
                          width: naturalWidth,
                          height: naturalHeight,
                        });
                      }
                    }
                  : undefined
              }
              className="block size-full object-cover"
            />
          </div>
        )}
        <CardMeta
          title={title}
          year={year}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-overlay-100/70 via-overlay-100/35 to-overlay-0 pt-4 pb-1 md:pointer-fine:hidden"
        />
      </div>
      <div className="hidden w-full shrink-0 md:pointer-fine:grid md:pointer-fine:grid-rows-[0fr] md:pointer-fine:opacity-0 md:pointer-fine:transition-[grid-template-rows,opacity] md:pointer-fine:duration-300 md:pointer-fine:ease-[cubic-bezier(0.43,0.07,0.59,0.94)] md:pointer-fine:group-hover:grid-rows-[1fr] md:pointer-fine:group-hover:opacity-100 motion-reduce:md:pointer-fine:transition-none">
        <div className="min-h-0 overflow-hidden">
          <CardMeta title={title} year={year} className="relative py-1" />
        </div>
      </div>
    </div>,
  );
}
