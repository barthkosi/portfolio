import type { ReactNode } from "react";

export type BlogHeadingType = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type NotionHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const NOTION_HEADING_MAP: Record<NotionHeadingLevel, Exclude<BlogHeadingType, "h1">> = {
  1: "h2",
  2: "h3",
  3: "h4",
  4: "h5",
  5: "h6",
  6: "h6",
};

export function mapNotionHeadingLevel(
  level: NotionHeadingLevel,
): Exclude<BlogHeadingType, "h1"> {
  return NOTION_HEADING_MAP[level];
}

type BlogTextBlockProps = {
  className?: string;
  author?: string;
  body?: ReactNode;
  heading?: ReactNode;
  type?: BlogHeadingType | "Paragraph";
  variant?: "Heading" | "Body" | "Quote" | "Callout";
};

const CONTAINER_CLASSES: Record<string, string> = {
  "Heading:h1": "items-center",
  "Heading:h2": "items-start pt-12 pb-2",
  "Heading:h3": "items-start pt-[44px] pb-2",
  "Heading:h4": "items-start pt-10 pb-2",
  "Heading:h5": "items-start pt-9 pb-2",
  "Heading:h6": "items-start pt-8 pb-2",
  "Body:Paragraph": "items-start pt-3",
  "Quote:Paragraph": "items-start pt-3",
  "Callout:Paragraph": "items-start pt-3",
};

export function BlogTextBlock({
  className,
  author,
  body = "Lorem ipsum dolor sit amet consectetur. Pretium ultricies mus sapien pulvinar volutpat neque lacus. Eu blandit viverra magna at scelerisque. Ac aliquam nascetur lorem tincidunt libero.",
  heading = "Lorem ipsum dolor sit amet consectetur. ",
  type = "h1",
  variant = "Heading",
}: BlogTextBlockProps) {
  const layoutClass =
    CONTAINER_CLASSES[`${variant}:${type}`] ?? "items-center";
  const isQuoteLike =
    (variant === "Quote" || variant === "Callout") && type === "Paragraph";
  const showAuthor = variant === "Quote" && Boolean(author);

  return (
    <div
      className={
        className ?? `relative flex w-full shrink-0 flex-col gap-0 ${layoutClass}`
      }
    >
      {variant === "Heading" && type === "h1" && (
        <h1 className="h1 w-full shrink-0 text-center text-pretty text-content-primary">
          {heading}
        </h1>
      )}
      {variant === "Heading" && type === "h2" && (
        <h2 className="h2 w-full shrink-0 text-pretty text-content-primary">
          {heading}
        </h2>
      )}
      {variant === "Heading" && type === "h3" && (
        <h3 className="h3 w-full shrink-0 text-pretty text-content-primary">
          {heading}
        </h3>
      )}
      {variant === "Heading" && type === "h4" && (
        <h4 className="h4 w-full shrink-0 text-pretty text-content-primary">
          {heading}
        </h4>
      )}
      {variant === "Heading" && type === "h5" && (
        <h5 className="h5 w-full shrink-0 text-pretty text-content-primary">
          {heading}
        </h5>
      )}
      {variant === "Heading" && type === "h6" && (
        <h6 className="h6 w-full shrink-0 text-pretty text-content-primary">
          {heading}
        </h6>
      )}
      {variant === "Body" && type === "Paragraph" && (
        <p className="body-sm w-full shrink-0 text-pretty text-content-secondary">
          {body}
        </p>
      )}
      {isQuoteLike && (
        <>
          <div className="flex w-full shrink-0 flex-col items-start gap-0">
            <p className="h3 w-full shrink-0 text-pretty text-content-primary">
              {body}
            </p>
          </div>
          {showAuthor && (
            <div className="flex w-full shrink-0 flex-col items-start gap-0 pt-3">
              <p className="label-md h-fit w-fit shrink-0 whitespace-nowrap text-content-tertiary">
                {author}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
