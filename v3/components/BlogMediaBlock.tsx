export type BlogMediaItem = {
  src: string;
  alt?: string;
  caption?: string;
  kind?: "image" | "video";
};

type BlogMediaBlockProps = {
  items: BlogMediaItem[];
  className?: string;
};

const VIDEO_EXT_RE = /\.(mp4|webm|mov)(\?.*)?$/i;

function isVideoItem(item: BlogMediaItem): boolean {
  return item.kind === "video" || VIDEO_EXT_RE.test(item.src);
}

export function BlogMediaBlock({ items, className }: BlogMediaBlockProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={
        className ??
        "relative flex w-full shrink-0 flex-row items-start justify-center gap-2 pt-6 pb-4 lg:-mx-8 lg:w-[calc(100%+64px)]"
      }
    >
      {items.map((item, index) => (
        <div
          key={`${item.src}-${index}`}
          className="relative flex min-w-px flex-[1_0_0] flex-col items-start justify-start gap-2"
        >
          <div className="relative aspect-[240/135] w-full shrink-0 overflow-clip rounded-[16px]">
            {isVideoItem(item) ? (
              <video
                src={item.src}
                aria-label={item.alt ?? item.caption ?? ""}
                autoPlay
                loop
                muted
                playsInline
                className="pointer-events-none absolute inset-0 size-full max-w-none rounded-[16px] object-cover"
              />
            ) : (
              <img
                src={item.src}
                alt={item.alt ?? item.caption ?? ""}
                className="pointer-events-none absolute inset-0 size-full max-w-none rounded-[16px] object-cover"
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
      ))}
    </div>
  );
}
