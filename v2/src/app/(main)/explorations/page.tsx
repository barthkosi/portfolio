import { Metadata } from "next";
import { getContent, getAllTags } from "@/lib/content";
import ExplorationsContent from "@/components/pages/ExplorationsContent";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Explorations",
  description:
    "Personal experiments and creative explorations, from concept designs to visual studies.",
  alternates: {
    canonical: `${SITE_URL}/explorations`,
  },
  openGraph: {
    title: "Explorations by Barth Kosi",
    description:
      "Personal experiments and creative explorations, from concept designs to visual studies.",
    images: [
      {
        url: "https://res.cloudinary.com/barthkosi/image/upload/v1780760349/og/explorations.png",
      },
    ],
  },
};

export default async function ExplorationsPage() {
  const explorations = await getContent("explorations");
  const tags = getAllTags(explorations);

  return (
    <ExplorationsContent initialExplorations={explorations} allTags={tags} />
  );
}
