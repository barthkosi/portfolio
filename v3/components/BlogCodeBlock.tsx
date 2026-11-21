"use client";

import { Fragment, useState } from "react";

type BlogCodeBlockProps = {
  code: string;
  language?: string;
  className?: string;
};

const TAG_TOKEN_RE = /(<\/?[a-zA-Z][\w:-]*\s*\/?>)/g;

function renderHighlightedLine(line: string, lineIndex: number) {
  const parts = line.split(TAG_TOKEN_RE);
  return parts.map((part, partIndex) => {
    if (!part) return null;
    const isTag = TAG_TOKEN_RE.test(part);
    TAG_TOKEN_RE.lastIndex = 0;
    return (
      <span
        key={`${lineIndex}-${partIndex}`}
        className={isTag ? "text-content-info" : "text-content-secondary"}
      >
        {part}
      </span>
    );
  });
}

export function BlogCodeBlock({
  code,
  language = "HTML",
  className,
}: BlogCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [wrapped, setWrapped] = useState(true);

  const lines = code.split("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={
        className ??
        "relative flex w-full shrink-0 flex-col items-start justify-start gap-2 pt-4"
      }
    >
      <div className="relative flex w-full shrink-0 flex-col items-end justify-start gap-0 overflow-clip rounded-[12px] bg-background-base-secondary px-5 py-3 lg:-mx-4 lg:w-[calc(100%+32px)]">
        <pre
          className={`w-full shrink-0 font-mono text-[13.6px] leading-[21.6px] tracking-[0] text-content-secondary ${
            wrapped ? "whitespace-pre-wrap" : "overflow-x-auto whitespace-pre"
          }`}
        >
          <code>
            {lines.map((line, index) => (
              <Fragment key={index}>
                {renderHighlightedLine(line, index)}
                {index < lines.length - 1 ? "\n" : null}
              </Fragment>
            ))}
          </code>
        </pre>

        <div className="absolute top-1 right-1 flex h-fit w-fit flex-row items-center justify-start gap-0 overflow-clip rounded-[8px] bg-background-base-tertiary p-[2px]">
          <div className="relative flex h-fit w-fit shrink-0 flex-row items-center justify-start gap-1.5 rounded-[4px] px-1.5 py-1">
            <span className="h-fit w-fit shrink-0 font-sans text-[12px] leading-[16px] tracking-[0] whitespace-nowrap text-content-tertiary">
              {copied ? "Copied" : language}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy code"
            title="Copy code"
            className="relative size-6 shrink-0 cursor-pointer rounded-[4px] transition-colors hover:bg-background-base-tertiary"
          >
            <span className="pointer-events-none absolute top-[4px] left-[5.38px] h-[16px] w-[13.25px] overflow-clip">
              <img
                src="/images/code-copy.svg"
                alt=""
                width={13.25}
                height={16}
                className="block"
              />
            </span>
          </button>
          <button
            type="button"
            onClick={() => setWrapped((prev) => !prev)}
            aria-label="Toggle line wrap"
            aria-pressed={wrapped}
            title="Toggle line wrap"
            className={`relative size-6 shrink-0 cursor-pointer rounded-[4px] transition-colors hover:bg-background-base-tertiary ${
              wrapped ? "" : "bg-background-base-tertiary"
            }`}
          >
            <span className="pointer-events-none absolute top-[4px] left-[5.98px] h-[16px] w-[12.0469px] overflow-clip">
              <img
                src="/images/code-wrap.svg"
                alt=""
                width={12.0469}
                height={16}
                className="block"
              />
            </span>
          </button>
          <button
            type="button"
            aria-label="More code options"
            title="More options"
            className="relative size-6 shrink-0 cursor-pointer rounded-[4px] transition-colors hover:bg-background-base-tertiary"
          >
            <span className="pointer-events-none absolute top-[4px] left-[5.92px] h-[16px] w-[12.1562px] overflow-clip">
              <img
                src="/images/code-more.svg"
                alt=""
                width={12.1562}
                height={16}
                className="block"
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
