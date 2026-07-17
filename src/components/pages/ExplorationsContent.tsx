"use client";

import ContentIndex from "@/components/pages/ContentIndex";
import type { ContentItem } from "@/lib/content";

interface ExplorationsContentProps {
  initialExplorations: ContentItem[];
  allTags: string[];
}

export default function ExplorationsContent({
  initialExplorations,
  allTags,
}: ExplorationsContentProps) {
  return (
    <ContentIndex
      title="Explorations"
      description="Personal experiments and creative explorations, from concept designs to visual studies."
      emptyMessage="Explorations are coming soon!"
      items={initialExplorations}
      allTags={allTags}
      type="explorations"
    />
  );
}
