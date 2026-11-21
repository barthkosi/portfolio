import { Fragment, type ReactNode } from "react";
import { BlogCodeBlock } from "@/components/BlogCodeBlock";
import { BlogListBlock } from "@/components/BlogListBlock";
import { BlogMediaBlock } from "@/components/BlogMediaBlock";
import {
  BlogBold,
  BlogInlineCode,
  BlogItalic,
  BlogLink,
  BlogStrikethrough,
} from "@/components/BlogRichText";
import {
  BlogTextBlock,
  mapNotionHeadingLevel,
} from "@/components/BlogTextBlock";
import { Navigation } from "@/components/Navigation";
import {
  type ContentBlock,
  formatPostDate,
  type PostDocument,
  type RichTextSpan,
} from "@/lib/content-types";

const VIDEO_EXT_RE = /\.(mp4|webm|mov)(\?.*)?$/i;

function renderTextWithLineBreaks(text: string): ReactNode {
  if (!text.includes("\n")) return text;
  const parts = text.split("\n");
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 ? <br /> : null}
    </Fragment>
  ));
}

function renderRichText(spans: RichTextSpan[]): ReactNode {
  return spans.map((span, index) => {
    let node: ReactNode = renderTextWithLineBreaks(span.text);

    if (span.code) {
      node = <BlogInlineCode>{node}</BlogInlineCode>;
    }
    if (span.bold) {
      node = <BlogBold>{node}</BlogBold>;
    }
    if (span.italic) {
      node = <BlogItalic>{node}</BlogItalic>;
    }
    if (span.strikethrough) {
      node = <BlogStrikethrough>{node}</BlogStrikethrough>;
    }
    if (span.href) {
      const isExternal = /^https?:\/\//i.test(span.href);
      node = (
        <BlogLink
          href={span.href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
        >
          {node}
        </BlogLink>
      );
    }

    return <Fragment key={index}>{node}</Fragment>;
  });
}

function renderBlock(block: ContentBlock, index: number): ReactNode {
  if (block.type === "heading") {
    return (
      <BlogTextBlock
        key={index}
        variant="Heading"
        type={mapNotionHeadingLevel(block.level)}
        heading={renderRichText(block.richText)}
      />
    );
  }

  if (block.type === "paragraph") {
    return (
      <BlogTextBlock
        key={index}
        variant="Body"
        type="Paragraph"
        body={renderRichText(block.richText)}
      />
    );
  }

  if (block.type === "quote") {
    return (
      <BlogTextBlock
        key={index}
        variant="Quote"
        type="Paragraph"
        body={renderRichText(block.richText)}
        author={block.author}
      />
    );
  }

  if (block.type === "callout") {
    return (
      <BlogTextBlock
        key={index}
        variant="Callout"
        type="Paragraph"
        body={renderRichText(block.richText)}
      />
    );
  }

  if (block.type === "media") {
    return <BlogMediaBlock key={index} items={block.items} />;
  }

  if (block.type === "bulleted_list") {
    return (
      <BlogListBlock
        key={index}
        variant="bullet"
        items={block.items.map((item) => renderRichText(item))}
      />
    );
  }

  if (block.type === "numbered_list") {
    return (
      <BlogListBlock
        key={index}
        variant="numbered"
        items={block.items.map((item) => renderRichText(item))}
      />
    );
  }

  if (block.type === "code") {
    return (
      <BlogCodeBlock
        key={index}
        language={block.language}
        code={block.code}
      />
    );
  }

  return null;
}

export function BlogPostRenderer({ post }: { post: PostDocument }) {
  const formattedDate = formatPostDate(post.meta.date);
  const hasCover = Boolean(post.meta.coverImage);
  const coverIsVideo =
    Boolean(post.meta.coverImage) &&
    VIDEO_EXT_RE.test(post.meta.coverImage ?? "");

  return (
    <div className="relative flex min-h-full w-full flex-col items-center bg-background-primary px-4 pt-[120px] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:px-8 md:pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      <Navigation />
      <div className="relative z-[1] flex w-full shrink-0 flex-col items-center gap-16">
        <div className="relative flex w-full max-w-[960px] shrink-0 flex-col items-center gap-12">
          <div className="relative flex w-full max-w-[720px] shrink-0 flex-col items-center gap-5">
            {formattedDate && (
              <p className="label-sm w-full shrink-0 text-center text-content-tertiary">
                {formattedDate}
              </p>
            )}
            <BlogTextBlock
              variant="Heading"
              type="h1"
              heading={post.meta.title}
            />
            {post.meta.description && (
              <p className="label-lg w-full max-w-[624px] shrink-0 text-center text-content-tertiary">
                {post.meta.description}
              </p>
            )}
          </div>
          {hasCover && post.meta.coverImage && (
            <div className="relative aspect-[240/135] w-full shrink-0 overflow-clip rounded-[16px]">
              {coverIsVideo ? (
                <video
                  src={post.meta.coverImage}
                  aria-label={post.meta.title}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="pointer-events-none absolute inset-0 size-full max-w-none rounded-[16px] object-cover"
                />
              ) : (
                <img
                  src={post.meta.coverImage}
                  alt={post.meta.title}
                  className="pointer-events-none absolute inset-0 size-full max-w-none rounded-[16px] object-cover"
                />
              )}
            </div>
          )}
        </div>

        <div className="relative flex w-full max-w-[640px] shrink-0 flex-col items-start">
          {post.blocks.map((block, index) => renderBlock(block, index))}
        </div>
      </div>
    </div>
  );
}
