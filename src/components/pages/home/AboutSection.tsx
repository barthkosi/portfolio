"use client";

import ScrollReveal from "@/components/interface/ScrollReveal";

export default function AboutSection() {
    return (
        <section className="w-full flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-0 h-fit px-4 md:px-8 lg:px-20 py-8 md:py-12">
            <div className="w-full">
                <h6>About Me</h6>
            </div>
            <ScrollReveal className="w-full md:col-span-2">
                I'm obsessed with the 'why' behind digital experiences. For me, good design isn't about shipping features—it's about removing friction and rejecting manipulation. I want to build software that feels human, helpful, and properly optimized for the individual. The long term goal is simple: turn these ideas into a framework that others can use to build better, kinder tools.
            </ScrollReveal>
        </section>
    );
}
