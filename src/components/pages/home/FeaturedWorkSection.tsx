"use client";

import Button from "@/components/interface/Button";
import Card from "@/components/interface/Card";
import featuredWork from "@/data/featuredWork.json";

export default function FeaturedWorkSection() {
    const firstRow = featuredWork.filter(item => !item.row || item.row === 1);
    const secondRow = featuredWork.filter(item => item.row === 2);

    return (
        <section className="flex flex-col items-center px-4 md:px-8 lg:px-20 py-8 md:py-12 pt-20 gap-8">
            <div className="flex flex-col gap-4 w-full text-start">
                <h2 className="h4">Featured Work</h2>
            </div>

            <div className="flex flex-col gap-4 md:gap-6">
                {/* First row */}
                <div className="flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-6">
                    {firstRow.map((item) => (
                        <div
                            key={item.id}
                            className={item.colSpan === 2 ? "col-span-2" : "col-span-1"}
                        >
                            <Card
                                image={item.image}
                                title={item.title}
                                description={item.description}
                                link={item.link}
                                tags={item.tags}
                                aspectRatio={item.aspectRatio as "16:9" | "2:3" | "auto" | undefined}
                                variant="list-stacked"
                            />
                        </div>
                    ))}
                </div>

                {/* Second row */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                    {secondRow.map((item) => (
                        <div key={item.id} className="w-full">
                            <Card
                                image={item.image}
                                title={item.title}
                                description={item.description}
                                link={item.link}
                                tags={item.tags}
                                aspectRatio={item.aspectRatio as "16:9" | "2:3" | "auto" | undefined}
                                variant="list-stacked"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <Button to="/work" variant="secondary">View All Work</Button>
        </section>
    );
}
