"use client";

import Button from "@/components/interface/Button";
import Card from "@/components/interface/Card";
import writingData from "@/data/home/writing.json";

type HomeWritingItem = {
  id: string;
  image: string;
  title: string;
  description: string;
  link: string;
  bannerImage?: string;
  locked?: boolean;
};

const homeWriting = writingData as HomeWritingItem[];

export default function WritingSection() {
  return (
    <section className="overflow-visible flex flex-col lg:flex-row items-center gap-8 px-4 md:px-8 py-8 md:py-12">
      <div className="w-full max-w-[400px] flex flex-col gap-2 items-center lg:items-start text-center lg:text-left lg:top-[134px] sticky self-start mx-auto">
        <div className="w-full">
          <h2 className="h3">Writing</h2>
        </div>
        <div className="w-full">
          <p className="text-[var(--content-secondary)]">
            I write about tech, design and the messy human condition.
          </p>
        </div>
        <div className="hidden lg:block">
          <Button to="/writing" variant="secondary">
            See Writing
          </Button>
        </div>
      </div>

      <ul className="w-full flex flex-col gap-5 lg:gap-20">
        {homeWriting.map((item, index) => (
          <li
            key={item.id}
            className={
              index === 0
                ? "w-full lg:top-[134px] lg:sticky self-start"
                : "w-full lg:top-[134px] sticky self-start"
            }
          >
            <Card
              image={item.image}
              bannerImage={item.bannerImage}
              title={item.title}
              description={item.description}
              link={item.link}
              variant="list-stacked"
              locked={item.locked}
            />
          </li>
        ))}
      </ul>

      <div className="w-fit lg:hidden">
        <Button to="/writing" variant="secondary">
          See Writing
        </Button>
      </div>
    </section>
  );
}
