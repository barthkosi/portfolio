import { Barth } from "@/components/Barth";
import { Navigation } from "@/components/Navigation";

export default function Home() {
  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center gap-0 overflow-clip bg-background-primary p-4">
      <div className="relative flex w-full shrink-0 flex-col items-center gap-8 px-1 md:max-w-[360px]">
        <div className="relative flex w-full shrink-0 flex-col items-center gap-4">
          <div className="relative h-[69.728px] w-[63.684px] shrink-0">
            <img src="/images/hero-mark.svg" alt="" className="block size-full" />
          </div>
          <div className="relative flex w-full shrink-0 flex-col items-start gap-5">
            <p className="body-sm w-full shrink-0 text-center text-pretty text-content-primary">
              Barth is a design engineer building  beautiful and intuitive digital products.
            </p>
            <p className="body-sm w-full shrink-0 text-center text-pretty text-content-primary">
              He has 4+ years of experience and has worked with businesses and studios building interesting products.
            </p>
          </div>
        </div>
        <div className="relative flex h-fit w-fit shrink-0 flex-row items-start justify-center gap-8">
          <p className="label-md h-fit w-fit shrink-0 whitespace-nowrap text-center text-content-tertiary">
            Work
          </p>
          <p className="label-md h-fit w-fit shrink-0 whitespace-nowrap text-center text-content-tertiary">
            Writing
          </p>
        </div>
      </div>
      <Navigation />
      <Barth />
    </div>
  );
}
