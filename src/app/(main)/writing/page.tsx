import { Metadata } from "next";
import { getContent, getAllTags } from "@/lib/content";
import WritingContent from "@/components/pages/WritingContent";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Written",
  description:
    "My internal monologues externalized, covering everything from tech to the messy human condition.",
  alternates: {
    canonical: `${SITE_URL}/writing`,
  },
  openGraph: {
    title: "Written by Barth Kosi",
    description:
      "My internal monologues externalized, covering everything from tech to the messy human condition.",
    images: [
      {
        url: "https://res.cloudinary.com/barthkosi/image/upload/v1780760351/og/writing.png",
      },
    ],
  },
};

export default async function WritingPage() {
  const posts = await getContent("writing");
  const tags = getAllTags(posts);

  return <WritingContent initialPosts={posts} allTags={tags} />;
}
