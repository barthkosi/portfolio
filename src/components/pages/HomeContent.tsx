"use client";

import {
    HeroSection,
    FeaturedWorkSection,
    ExplorationsSection,
    WritingSection,
    AboutSection
} from "@/components/pages/home";

export default function HomeContent() {
    return (
        <main>
            <div className='overflow-hidden flex flex-col items-center gap-8 lg:gap-16'>
                <HeroSection />
                <FeaturedWorkSection />
            </div>
            <AboutSection />
            <ExplorationsSection />
            <WritingSection />
        </main>
    );
}
