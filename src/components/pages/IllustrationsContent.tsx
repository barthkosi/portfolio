"use client";

import { motion } from "motion/react";
import { Masonry, RenderComponentProps } from "masonic";
import { springBouncy } from "@/lib/transitions";
import { useState, useMemo, useCallback } from "react";
import InfoBlock from "@/components/InfoBlock";
import Card from "@/components/Card";
import illustrations from "@/data/illustrations.json";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

type IllustrationItem = {
    id: string;
    image: string;
};

const IllustrationCard = ({
    data,
    index,
    isVisible,
}: RenderComponentProps<IllustrationItem> & { isVisible: boolean }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ ...springBouncy, delay: index * 0.05 }}
    >
        <Card image={data.image} aspectRatio="auto" />
    </motion.div>
);

export default function IllustrationsContent() {
    const [areImagesVisible, setAreImagesVisible] = useState(false);
    const { columnCount, gutter } = useResponsiveLayout();

    const renderCard = useCallback(
        (props: RenderComponentProps<IllustrationItem>) => (
            <IllustrationCard {...props} isVisible={areImagesVisible} />
        ),
        [areImagesVisible]
    );

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
