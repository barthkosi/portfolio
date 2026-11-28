import { getOptimizedImageProps } from "@/lib/media";

export type BlogMediaItem = {
  src: string;
  alt?: string;
  caption?: string;
  kind?: "image" | "video";
  width?: number;
  height?: number;
};

type BlogMediaBlockProps = {
  items: BlogMediaItem[];
  hasMediaBefore?: boolean;
  hasMediaAfter?: boolean;
  isShowcase?: boolean;
  priority?: boolean;
  className?: string;
};

const VIDEO_EXT_RE = /\.(mp4|webm|mov)(\?.*)?$/i;
const SINGLE_MEDIA_WIDTHS = [640, 1080, 1600] as const;
const MULTI_STANDARD_WIDTHS = [480, 800] as const;
const MULTI_SHOWCASE_WIDTHS = [480, 800, 1080] as const;

function isVideoItem(item: BlogMediaItem): boolean {
  return item.kind === "video" || VIDEO_EXT_RE.test(item.src);
}

function getMediaImageSizes(count: number, isShowcase: boolean): string {
  if (count <= 1) {
    return isShowcase
      ? "(min-width: 1664px) 1600px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 32px)"
      : "(min-width: 1024px) 704px, (min-width: 768px) 640px, calc(100vw - 32px)";
  }
  return isShowcase
    ? `(min-width: 1664px) ${Math.round(1600 / count)}px, (min-width: 768px) calc((100vw - 64px) / ${count}), calc(100vw - 32px)`
    : `(min-width: 768px) ${Math.round(704 / count)}px, calc(100vw - 32px)`;
}

export function BlogMediaBlock({
  items,
  hasMediaBefore = false,
  hasMediaAfter = false,
  isShowcase = false,
  priority = false,
  className,
}: BlogMediaBlockProps) {
  if (items.length === 0) return null;

  const topPadding = hasMediaBefore ? "pt-0" : "pt-6";
  const bottomPadding = hasMediaAfter ? "pb-2 lg:pb-4" : "pb-4";
  const desktopBleed = isShowcase ? "" : "lg:-mx-8 lg:w-[calc(100%+64px)]";
  const widths =
    items.length <= 1
      ? SINGLE_MEDIA_WIDTHS
      : isShowcase
        ? MULTI_SHOWCASE_WIDTHS
        : MULTI_STANDARD_WIDTHS;
  const sizes = getMediaImageSizes(items.length, isShowcase);

  return (
    <div
      className={
        className ??
        `relative flex w-full shrink-0 flex-col items-start justify-center gap-2 md:flex-row lg:gap-4 ${topPadding} ${bottomPadding} ${desktopBleed}`
      }
    >
      {items.map((item, index) => {
        const hasDimensions =
          typeof item.width === "number" &&
          item.width > 0 &&
          typeof item.height === "number" &&
          item.height > 0;
        const aspectStyle = hasDimensions
          ? { aspectRatio: `${item.width} / ${item.height}` }
          : undefined;
        const isVideo = isVideoItem(item);
        const imgProps = isVideo
          ? null
          : getOptimizedImageProps({
              src: item.src,
              widths,
              sizes,
              maxWidth: hasDimensions ? item.width : null,
            });

        return (
          <figure
            key={`${item.src}-${index}`}
            className="relative flex w-full flex-col items-start justify-start gap-2 md:min-w-px md:flex-[1_0_0]"
          >
            <div
              style={aspectStyle}
              className="relative w-full shrink-0 overflow-clip rounded-[16px]"
            >
              {isVideo ? (
                <video
                  src={item.src}
                  aria-label={item.alt ?? item.caption ?? ""}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className={
                    hasDimensions
                      ? "pointer-events-none block size-full rounded-[16px] object-cover"
                      : "pointer-events-none block h-auto w-full rounded-[16px]"
                  }
                />
              ) : (
                imgProps && (
                  <img
                    {...imgProps}
                    alt={item.alt ?? item.caption ?? ""}
                    width={hasDimensions ? item.width : undefined}
                    height={hasDimensions ? item.height : undefined}
                    loading={priority ? "eager" : "lazy"}
                    fetchPriority={priority ? "high" : undefined}
                    decoding="async"
                    className={
                      hasDimensions
                        ? "pointer-events-none block size-full rounded-[16px] object-cover"
                        : "pointer-events-none block h-auto w-full rounded-[16px]"
                    }
                  />
                )
              )}
            </div>
            {item.caption && (
              <figcaption className="relative flex w-full max-w-[720px] shrink-0 flex-col items-center justify-start gap-5">
                <p className="label-xs w-full shrink-0 text-center text-content-tertiary">
                  {item.caption}
                </p>
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}
