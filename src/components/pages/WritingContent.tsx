"use client";

import ContentIndex from "@/components/pages/ContentIndex";
import type { ContentItem } from "@/lib/content";

interface WritingContentProps {
    initialPosts: ContentItem[];
    allTags: string[];
}

export default function WritingContent({ initialPosts, allTags }: WritingContentProps) {
    return (
        <ContentIndex
            title="Writing"
            description="My internal monologues externalized, covering everything from tech to the messy human condition."
            emptyMessage="Writing is coming soon!"
            items={initialPosts}
            allTags={allTags}
            type="writing"
        />
    );
}
