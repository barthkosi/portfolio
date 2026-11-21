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
  className?: string;
};

const VIDEO_EXT_RE = /\.(mp4|webm|mov)(\?.*)?$/i;

function isVideoItem(item: BlogMediaItem): boolean {
  return item.kind === "video" || VIDEO_EXT_RE.test(item.src);
}

export function BlogMediaBlock({
  items,
  hasMediaBefore = false,
  hasMediaAfter = false,
  className,
}: BlogMediaBlockProps) {
  if (items.length === 0) return null;

  const verticalPadding = `${hasMediaBefore ? "pt-0" : "pt-6"} ${hasMediaAfter ? "pb-2" : "pb-4"}`;

  return (
    <div
      className={
        className ??
        `relative flex w-full shrink-0 flex-row items-start justify-center gap-2 ${verticalPadding} lg:-mx-8 lg:w-[calc(100%+64px)]`
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

        return (
          <div
            key={`${item.src}-${index}`}
            className="relative flex min-w-px flex-[1_0_0] flex-col items-start justify-start gap-2"
          >
            <div
              style={aspectStyle}
              className="relative w-full shrink-0 overflow-clip rounded-[16px]"
            >
              {isVideoItem(item) ? (
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
                <img
                  src={item.src}
                  alt={item.alt ?? item.caption ?? ""}
                  width={hasDimensions ? item.width : undefined}
                  height={hasDimensions ? item.height : undefined}
                  decoding="async"
                  className={
                    hasDimensions
                      ? "pointer-events-none block size-full rounded-[16px] object-cover"
                      : "pointer-events-none block h-auto w-full rounded-[16px]"
                  }
                />
              )}
            </div>
            {item.caption && (
              <div className="relative flex w-full max-w-[720px] shrink-0 flex-col items-center justify-start gap-5">
                <p className="label-xs w-full shrink-0 text-center text-content-tertiary">
                  {item.caption}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
