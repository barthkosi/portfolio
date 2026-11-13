function Card({
  aspectRatio = "16:9",
  showMeta = false,
  title = "Title",
  year = "2026",
}: {
  aspectRatio?: "16:9" | "1:1" | "4:5";
  showMeta?: boolean;
  title?: string;
  year?: string;
}) {
  const aspectClass =
    aspectRatio === "1:1"
      ? "aspect-[472/472]"
      : aspectRatio === "4:5"
        ? "aspect-[472/590]"
        : "aspect-[160/90]";

  return (
    <div
      className={`relative flex w-full shrink-0 flex-col items-start gap-0 rounded-[4px] bg-background-tertiary ${aspectClass}`}
    >
      <div className="relative min-h-px w-full flex-[1_0_0] rounded-t-[4px] bg-background-tertiary" />
      {showMeta && (
        <div className="relative flex w-full shrink-0 items-center justify-between gap-0 px-2 py-1">
          <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-primary">
            {title}
          </p>
          <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-tertiary">
            {year}
          </p>
        </div>
      )}
    </div>
  );
}

function Pages() {
  return (
    <div className="relative flex w-full shrink-0 flex-col items-start gap-0">
      <div className="relative flex w-full shrink-0 items-center justify-between gap-0 rounded-[4px] bg-background-tertiary p-2">
        <p className="label-sm h-fit w-fit shrink-0 whitespace-nowrap text-content-primary">
          Work
        </p>
      </div>
      <div className="relative flex w-full shrink-0 items-center justify-between gap-0 rounded-[4px] p-2">
        <p className="label-sm h-fit w-fit shrink-0 whitespace-nowrap text-content-secondary">
          Explorations
        </p>
      </div>
      <div className="relative flex w-full shrink-0 items-center justify-between gap-0 rounded-[4px] p-2">
        <p className="label-sm h-fit w-fit shrink-0 whitespace-nowrap text-content-secondary">
          Writing
        </p>
      </div>
      <div className="relative flex w-full shrink-0 items-center justify-between gap-0 rounded-[4px] p-2">
        <p className="label-sm h-fit w-fit shrink-0 whitespace-nowrap text-content-secondary">
          Illustrations
        </p>
      </div>
      <div className="relative flex w-full shrink-0 items-center justify-between gap-0 rounded-[4px] p-2">
        <p className="label-sm h-fit w-fit shrink-0 whitespace-nowrap text-content-secondary">
          Contact
        </p>
      </div>
    </div>
  );
}

function SocialLinks() {
  return (
    <div className="relative flex shrink-0 flex-col items-start gap-2 p-2">
      <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-tertiary uppercase opacity-60">
        Socials
      </p>
      <div className="relative flex shrink-0 flex-col items-start gap-1">
        <div className="relative flex shrink-0 items-start gap-0">
          <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-secondary">
            X (Twitter)
          </p>
        </div>
        <div className="relative flex shrink-0 items-start gap-0">
          <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-secondary">
            Github
          </p>
        </div>
        <div className="relative flex shrink-0 items-start gap-0">
          <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-secondary">
            Cosmos
          </p>
        </div>
        <div className="relative flex shrink-0 items-start gap-0">
          <p className="label-xs h-fit w-fit shrink-0 whitespace-nowrap text-content-secondary">
            Instagram
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LabPage() {
  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center bg-background-primary p-4">
      <div className="relative flex h-[600px] w-[800px] flex-col items-end gap-[44px] overflow-clip rounded-[12px] bg-background-secondary p-2">
        <div className="relative flex h-fit w-fit shrink-0 flex-row items-center gap-0 p-2">
          <div className="relative size-5 shrink-0">
            <img src="/images/nav-minus.svg" alt="" className="block size-full" />
          </div>
        </div>
        <div className="relative grid min-h-0 w-full flex-1 grid-cols-[repeat(8,minmax(0,1fr))] grid-rows-[minmax(0,1fr)] gap-3">
          <div className="relative col-[span_2] flex shrink-0 flex-col items-start justify-between self-stretch justify-self-stretch">
            <Pages />
            <SocialLinks />
          </div>
          <div className="nav-scrollbar relative col-[span_6] -mb-2 pb-2 flex min-h-0 shrink-0 items-start gap-2 self-stretch justify-self-stretch overflow-y-auto">
            <div className="relative flex min-w-px flex-[1_0_0] flex-col items-start justify-center gap-2">
              <Card aspectRatio="16:9" showMeta />
              <Card aspectRatio="1:1" />
              <Card aspectRatio="16:9" />
            </div>
            <div className="relative flex min-w-px flex-[1_0_0] flex-col items-start justify-center gap-2">
              <Card aspectRatio="4:5" />
              <Card aspectRatio="16:9" />
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute top-[5px] left-[-32px] flex size-[71.36px] items-center justify-center">
          <div className="-rotate-12 flex-none">
            <div className="relative size-[60.165px]">
              <img src="/images/nav-logo.svg" alt="" className="block size-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
