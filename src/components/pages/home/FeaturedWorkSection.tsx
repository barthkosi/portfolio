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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
                {featuredWork.map((item) => (
                    <div
                        key={item.id}
                        className={item.colSpan === 2 ? "md:col-span-2" : "md:col-span-1"}
                    >
                        <Card
                            image={item.image}
                            title={item.title}
                            description={item.description}
                            link={item.link}
                            tags={item.tags}
                            aspectRatio={item.aspectRatio as "16:9" | "2:3" | "auto" | undefined}
                            variant="list-stacked"
                            locked={"locked" in item && (item as any).locked}
                        />
                    </div>
                ))}
            </div>

            <Button to="/work" variant="secondary">View All Work</Button>
        </section>
    );
}
