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
      description="Projects, case studies, explorations, and writings."
      emptyMessage="No items found!"
      items={initialProjects}
      allTags={allTags}
      initialType="all"
    />
  );
}
