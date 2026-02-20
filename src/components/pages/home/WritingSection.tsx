"use client";

import Button from "@/components/interface/Button";
import Card from "@/components/interface/Card";
import writingData from "@/data/writing.json";

export default function WritingSection() {
    return (
        <section className="overflow-visible flex flex-col lg:flex-row items-center gap-8 px-4 md:px-8 lg:px-20 py-8 md:py-12">
            <div className="w-full max-w-[400px] flex flex-col gap-2 items-center lg:items-start text-center lg:text-left lg:top-[134px] sticky self-start mx-auto">
                <div className="w-full">
                    <h3>Writing</h3>
                </div>
                <div className="w-full">
                    <p className="text-[var(--content-secondary)]">I write about tech, design and the messy human condition.</p>
                </div>
                <div className="hidden lg:block">
                    <Button to="/writing" variant="secondary">
                        See Writing
                    </Button>
                </div>
            </div>

            <div className="w-full flex flex-col gap-5 lg:gap-20">
                {writingData.map((item, index) => (
                    <div
                        key={item.id}
                        className={index === 0 ? "lg:top-[134px] lg:sticky self-start" : "lg:top-[134px] sticky self-start"}
                    >
                        <Card
                            image={item.image}
                            title={item.title}
                            description={item.description}
                            link={item.link}
                            variant="list-stacked"
                        />
                    </div>
                ))}
            </div>

            <div className="w-fit lg:hidden">
                <Button to="/writing" variant="secondary">
                    See Writing
                </Button>
            </div>
        </section>
    );
}
