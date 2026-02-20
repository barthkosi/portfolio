import { useEffect } from "react";
import Head from "../components/interface/Head";
import { useLoading } from "../context/LoadingContext";
import heroMarquee from "../data/heroMarquee.json";
import {
  HeroSection,
  FeaturedWorkSection,
  ExplorationsSection,
  WritingSection,
  AboutSection
} from "@/components/home";

export default function Home() {
  const { isContentReady, addBlocker, removeBlocker } = useLoading();

  useEffect(() => {
    const BLOCKER_KEY = 'home-images';
    addBlocker(BLOCKER_KEY);

    const imagesToPreload = [...heroMarquee.map(item => item.image)];
    let loadedCount = 0;
    const totalImages = imagesToPreload.length;

    const checkComplete = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        removeBlocker(BLOCKER_KEY);
      }
    };

    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.onload = checkComplete;
      img.onerror = checkComplete;
      img.src = src;
    });

    return () => removeBlocker(BLOCKER_KEY);
  }, [addBlocker, removeBlocker]);

  return (
    <>
      <main>
        <div className='overflow-hidden flex flex-col items-center gap-8 lg:gap-16'>
          <Head
            title="barthkosi - design & engineering"
            description="Barth creates visual systems and digital experiences. Explore my portfolio of web interactions, engineered solutions, and dynamic motion design."
          />
          <HeroSection isContentReady={isContentReady} />
          <FeaturedWorkSection />
        </div>
        <AboutSection />
        <ExplorationsSection />
        <WritingSection />
      </main>
    </>
  );
}
