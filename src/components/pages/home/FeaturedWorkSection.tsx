"use client";

import Button from "@/components/interface/Button";
import Card from "@/components/interface/Card";
import featuredWork from "@/data/home/featuredWork.json";

type FeaturedWorkItem = {
    id: string;
    image: string;
    title: string;
    description: string;
    link: string;
    bannerImage?: string;
    tags?: string[];
    aspectRatio?: string;
    locked?: boolean;
};

const featuredWorkItems = featuredWork as FeaturedWorkItem[];

export default function FeaturedWorkSection() {
    return (
        <section className="flex flex-col items-center px-4 md:px-8 py-8 md:py-12 gap-8">
            <div className="flex flex-col gap-4 w-full text-start">
                <h2 className="h4">Featured Work</h2>
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
                {featuredWorkItems.slice(0, 2).map((item) => (
                    <li key={item.id}>
                        <Card
                            image={item.image}
                            bannerImage={item.bannerImage}
                            title={item.title}
                            description={item.description}
                            link={item.link}
                            tags={item.tags}
                            aspectRatio={item.aspectRatio}
                            shimmerAspectRatio={item.aspectRatio === "auto" ? "3 / 2" : item.aspectRatio}
                            variant="list-stacked"
                            locked={item.locked}
                        />
                    </li>
                ))}
            </ul>

            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
                {featuredWorkItems.slice(2).map((item) => (
                    <li key={item.id}>
                        <Card
                            image={item.image}
                            bannerImage={item.bannerImage}
                            title={item.title}
                            description={item.description}
                            link={item.link}
                            tags={item.tags}
                            aspectRatio={item.aspectRatio}
                            shimmerAspectRatio={item.aspectRatio === "auto" ? "3 / 2" : item.aspectRatio}
                            variant="list-stacked"
                            locked={item.locked}
                        />
                    </li>
                ))}
            </ul>

            <Button to="/work" variant="secondary">View All Work</Button>
        </section>
    );
}
