"use client";

import ContentIndex from "@/components/pages/ContentIndex";
import type { ContentItem } from "@/lib/content";

interface WorkContentProps {
  initialProjects: ContentItem[];
  allTags: string[];
}

export default function WorkContent({
  initialProjects,
  allTags,
}: WorkContentProps) {
  return (
    <ContentIndex
      title="Work"
      description="These entries document my process of building and refining tools that serve a purpose."
      emptyMessage="Work is coming soon!"
      items={initialProjects}
      allTags={allTags}
      type="work"
    />
  );
}
