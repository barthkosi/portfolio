export function Navigation() {
  return (
    <div className="absolute top-4 right-4 left-4 flex flex-col items-end gap-[44px] overflow-clip rounded-[12px] bg-background-tertiary p-2 backdrop-blur-[2px] md:right-8 md:left-8 lg:right-auto lg:left-1/2 lg:w-[800px] lg:-translate-x-1/2">
      <div className="relative flex h-fit w-fit shrink-0 flex-row items-center gap-0 p-2">
        <div className="relative size-5 shrink-0">
          <img src="/images/nav-minus.svg" alt="" className="block size-full" />
        </div>
      </div>
      <div className="absolute top-[88px] left-[calc(100%-4px)] h-[56px] w-[4px] rounded-[4px] bg-background-tertiary" />
      <div className="absolute top-[5px] left-[-32px] flex size-[71.36px] items-center justify-center">
        <div className="-rotate-12 flex-none">
          <div className="relative size-[60.165px]">
            <img src="/images/nav-logo.svg" alt="" className="block size-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
