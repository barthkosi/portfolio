"use client";

import Button from "@/components/interface/Button";
import Card from "@/components/interface/Card";
import featuredWork from "@/data/home/featuredWork.json";

export default function FeaturedWorkSection() {
    return (
        <section className="flex flex-col items-center px-4 md:px-8 lg:px-20 py-8 md:py-12 pt-10 gap-8">
            <div className="flex flex-col gap-4 w-full text-start">
                <h2 className="h4">Featured Work</h2>
            </div>

            {/* Row 1: Atoms + Explrar — equal halves */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
                {featuredWork.slice(0, 2).map((item) => (
                    <Card
                        key={item.id}
                        image={item.image}
                        title={item.title}
                        description={item.description}
                        link={item.link}
                        tags={item.tags}
                        aspectRatio={item.aspectRatio as "16:9" | "2:3" | "auto" | undefined}
                        variant="list-stacked"
                        locked={"locked" in item && (item as any).locked}
                    />
                ))}
            </div>

            {/* Row 2: remaining 3 items — equal thirds */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
                {featuredWork.slice(2).map((item) => (
                    <Card
                        key={item.id}
                        image={item.image}
                        title={item.title}
                        description={item.description}
                        link={item.link}
                        tags={item.tags}
                        aspectRatio={item.aspectRatio as "16:9" | "2:3" | "auto" | undefined}
                        variant="list-stacked"
                        locked={"locked" in item && (item as any).locked}
                    />
                ))}
            </div>

            <Button to="/work" variant="secondary">View All Work</Button>
        </section>
    );
}
