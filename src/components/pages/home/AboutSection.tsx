"use client";

import ScrollReveal from "@/components/interface/ScrollReveal";

export default function AboutSection() {
    return (
        <section className="w-full flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-0 h-fit px-4 md:px-8 py-8 md:py-12">
            <div className="w-full">
                <h2 className="h6">About Me</h2>
            </div>
            <ScrollReveal className="w-full md:col-span-2">
                I&apos;m obsessed with the &apos;why&apos; behind digital experiences. For me, good design
                isn&apos;t about shipping features, it&apos;s about removing friction and rejecting
                manipulation. I want to build software that feels human, helpful, and properly optimized
                for the individual. The long term goal is simple: turn these ideas into a framework that
                others can use to build better, kinder tools.
            </ScrollReveal>
        </section>
    );
}
