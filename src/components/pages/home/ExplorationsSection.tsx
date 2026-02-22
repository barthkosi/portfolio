"use client";

import Button from "@/components/interface/Button";
import Card from "@/components/interface/Card";
import explorations from "@/data/home/explorations.json";

export default function ExplorationsSection() {
    return (
        <section className="flex flex-col items-center px-4 md:px-8 lg:px-20 py-8 md:py-12 gap-8">
            <div className="flex flex-col gap-2 max-w-[640px] text-center">
                <h3>Explorations</h3>
                <p className="text-[var(--content-secondary)]">Experiments, tests, and unfinished ideas.</p>
            </div>

            <div className="w-full flex flex-col md:flex-row gap-5">
                {explorations.map((item) => (
                    <div key={item.id} className="w-full">
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

            <Button to="/explorations" variant="secondary">
                See More
            </Button>
        </section>
    );
}
