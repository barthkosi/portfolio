import type { ReactNode } from "react";

type BlogTextBlockProps = {
  className?: string;
  author?: string;
  body?: ReactNode;
  heading?: string;
  type?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "Paragraph";
  variant?: "Heading" | "Body" | "Quote";
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
};

export function BlogTextBlock({
  className,
  author = "-me probably.",
  body = "Lorem ipsum dolor sit amet consectetur. Pretium ultricies mus sapien pulvinar volutpat neque lacus. Eu blandit viverra magna at scelerisque. Ac aliquam nascetur lorem tincidunt libero.",
  heading = "Lorem ipsum dolor sit amet consectetur. ",
  type = "h1",
  variant = "Heading",
}: BlogTextBlockProps) {
  const layoutClass =
    CONTAINER_CLASSES[`${variant}:${type}`] ?? "items-center";

  return (
    <div
      className={
        className ?? `relative flex w-full shrink-0 flex-col ${layoutClass}`
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
      {variant === "Quote" && type === "Paragraph" && (
        <>
          <div className="flex w-full shrink-0 flex-col items-start">
            <p className="h3 w-full shrink-0 text-pretty text-content-primary">
              {body}
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col items-start pt-3">
            <p className="label-md w-fit shrink-0 whitespace-nowrap text-content-tertiary">
              {author}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
