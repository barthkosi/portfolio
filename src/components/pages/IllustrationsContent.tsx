"use client";

import { useCallback, useState } from "react";
import { motion } from "motion/react";
import { Masonry, type RenderComponentProps } from "masonic";
import InfoBlock from "@/components/interface/InfoBlock";
import Card from "@/components/interface/Card";
import { useIsClient } from "@/hooks/useIsClient";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import illustrations from "@/data/illustrations.json";
import postMediaData from "@/data/post-media.json";
import { springBouncy } from "@/lib/transitions";

type IllustrationItem = {
    id: string;
    image: string;
};

type MediaMeta = {
    width: number;
    height: number;
    aspectRatio: string;
};

const postMedia = postMediaData as Record<string, MediaMeta | undefined>;

function IllustrationCard({
    data,
    index,
    isVisible,
}: RenderComponentProps<IllustrationItem> & { isVisible: boolean }) {
    const mediaMeta = postMedia[data.image];

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ ...springBouncy, delay: index * 0.05 }}
        >
            <Card
                image={data.image}
                aspectRatio="auto"
                shimmerAspectRatio={mediaMeta?.aspectRatio ?? "aspect-[3/4]"}
                imageWidth={mediaMeta?.width}
                imageHeight={mediaMeta?.height}
            />
        </motion.div>
    );
}

export default function IllustrationsContent() {
    const isClient = useIsClient();
    const [areImagesVisible, setAreImagesVisible] = useState(false);
    const { columnCount, gutter } = useResponsiveLayout();

    const renderCard = useCallback(
        (props: RenderComponentProps<IllustrationItem>) => (
            <IllustrationCard {...props} isVisible={areImagesVisible} />
        ),
        [areImagesVisible]
    );

    if (!isClient) {
        return null;
    }

    return (
        <div className="flex flex-col w-full gap-7 lg:gap-8 h-auto items-center justify-center">
            <div className="max-w-[480px]">
                <InfoBlock
                    variant="centered"
                    title="Illustrations"
                    number={illustrations.length}
                    description="A visual diary of forms. I believe only in continued iteration. This page is a snapshot of my ever growing dialogue with color, light, and composition."
                    onComplete={() => setAreImagesVisible(true)}
                />
            </div>
            <div className="w-full">
                <Masonry
                    key={`${columnCount}-${gutter}`}
                    items={illustrations}
                    columnGutter={gutter}
                    columnCount={columnCount}
                    overscanBy={5}
                    render={renderCard}
                />
            </div>
        </div>
    );
}
