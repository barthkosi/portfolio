import type { CSSProperties } from "react";
import { TransitionLink } from "@/components/interface/PageTransition";
import { getOptimizedImageProps } from "@/lib/media";

export type CardVariant = "Default" | "Media" | "Horizontal";

type CardProps = {
  variant?: CardVariant;
  aspectClass?: string;
  title?: string;
  year?: string;
  image?: string;
  imageWidth?: number | null;
  alt?: string;
  href?: string;
  onClick?: () => void;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
  onImageLoad?: (dimensions: { width: number; height: number }) => void;
};

const HORIZONTAL_IMAGE_WIDTHS = [240] as const;
const MEDIA_IMAGE_WIDTHS = [480] as const;
const DEFAULT_IMAGE_WIDTHS = [480, 800] as const;
const DEFAULT_IMAGE_SIZES = "(min-width: 768px) 300px, calc(100vw - 48px)";

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
    <span
      className={`flex w-full items-center justify-between gap-2 ${className || ""}`}
    >
      <span className="label-sm block h-fit w-fit min-w-0 truncate text-content-primary">
        {title}
      </span>
      <span className="label-sm block h-fit w-fit shrink-0 whitespace-nowrap text-content-tertiary">
        {year}
      </span>
    </span>
  );
}

export function Card({
  variant = "Default",
  aspectClass,
  title = "Title",
  year = "2026",
  image,
  imageWidth,
  alt,
  href,
  onClick,
  priority = false,
  className,
  style,
  onImageLoad,
}: CardProps) {
  const imageLoading = priority ? "eager" : "lazy";

  const wrapIfLink = (content: React.ReactNode) => {
    if (!href) return content;
    return (
      <TransitionLink
        href={href}
        onCovered={onClick}
        className="block w-full shrink-0"
      >
        {content}
      </TransitionLink>
    );
  };

  if (variant === "Horizontal") {
    const imgProps = image
      ? getOptimizedImageProps({
          src: image,
          widths: HORIZONTAL_IMAGE_WIDTHS,
          maxWidth: imageWidth,
        })
      : null;

    return wrapIfLink(
      <span
        style={style}
        className={`relative flex w-full shrink-0 items-center gap-0 rounded-[4px] ${className || ""}`}
      >
        <span className="relative block aspect-[71.11111450195312/40] max-h-[54px] max-w-[96px] min-w-px flex-[1_0_0] overflow-hidden rounded-[4px] bg-background-tertiary">
          {imgProps && (
            <img
              {...imgProps}
              alt={alt ?? title}
              loading={imageLoading}
              decoding="async"
              className="pointer-events-none block size-full object-cover"
            />
          )}
        </span>
        <span className="relative flex min-w-px flex-[1_0_0] flex-col items-start gap-1.5 px-2 py-1">
          <span className="label-md block h-fit w-fit max-w-full shrink-0 truncate whitespace-nowrap text-content-primary">
            {title}
          </span>
          <span className="label-xs block h-fit w-fit shrink-0 whitespace-nowrap text-content-tertiary">
            {year}
          </span>
        </span>
      </span>,
    );
  }

  if (variant === "Media") {
    const imgProps = image
      ? getOptimizedImageProps({
          src: image,
          widths: MEDIA_IMAGE_WIDTHS,
          maxWidth: imageWidth,
        })
      : null;

    const mediaTag = href ? (
      <span
        style={style}
        className={`relative block w-full shrink-0 overflow-hidden rounded-[4px] bg-background-tertiary ${aspectClass || ""} ${className || ""}`}
      >
        {imgProps && (
          <img
            {...imgProps}
            alt={alt ?? ""}
            loading={imageLoading}
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
      </span>
    ) : (
      <figure
        style={style}
        className={`relative w-full shrink-0 overflow-hidden rounded-[4px] bg-background-tertiary ${aspectClass || ""} ${className || ""}`}
      >
        {imgProps && (
          <img
            {...imgProps}
            alt={alt ?? ""}
            loading={imageLoading}
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
      </figure>
    );
    return wrapIfLink(mediaTag);
  }

  const innerAspectStyle = style?.aspectRatio
    ? { aspectRatio: style.aspectRatio }
    : undefined;

  const defaultImgProps = image
    ? getOptimizedImageProps({
        src: image,
        widths: DEFAULT_IMAGE_WIDTHS,
        sizes: DEFAULT_IMAGE_SIZES,
        maxWidth: imageWidth,
      })
    : null;

  return wrapIfLink(
    <span
      className={`group relative flex w-full shrink-0 flex-col items-start gap-2 md:pointer-fine:gap-0 ${className || ""}`}
    >
      <span
        style={style}
        className={`relative flex w-full shrink-0 flex-col items-start gap-0 overflow-hidden rounded-[4px] bg-background-tertiary ${aspectClass || ""}`}
      >
        <span className="relative block min-h-px w-full flex-[1_0_0] overflow-hidden rounded-t-[4px] bg-background-tertiary">
          {defaultImgProps && (
            <span
              style={innerAspectStyle}
              className={`pointer-events-none absolute top-0 left-0 block w-full ${
                innerAspectStyle ? "" : aspectClass || "h-full"
              }`}
            >
              <img
                {...defaultImgProps}
                alt={alt ?? title}
                loading={imageLoading}
                decoding="async"
                onLoad={
                  onImageLoad
                    ? (event) => {
                        const { naturalWidth, naturalHeight } =
                          event.currentTarget;
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
            </span>
          )}
        </span>
        <span className="hidden w-full shrink-0 md:pointer-fine:grid md:pointer-fine:grid-rows-[0fr] md:pointer-fine:opacity-0 md:pointer-fine:transition-card-reveal md:pointer-fine:group-hover:grid-rows-[1fr] md:pointer-fine:group-hover:opacity-100 motion-reduce:md:pointer-fine:transition-none">
          <span className="block min-h-0 overflow-hidden">
            <CardMeta title={title} year={year} className="relative px-2 py-1" />
          </span>
        </span>
      </span>
      {(title || year) && (
        <CardMeta title={title} year={year} className="md:pointer-fine:hidden" />
      )}
    </span>,
  );
}
