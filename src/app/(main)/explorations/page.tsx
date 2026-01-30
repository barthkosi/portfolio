import { Metadata } from "next";
import { getContent, getAllTags } from "@/lib/content";
import ExplorationsContent from "@/components/pages/ExplorationsContent";

export const metadata: Metadata = {
    title: "barthkosi - explorations",
    description: "Personal experiments and creative explorations, from concept designs to visual studies.",
    openGraph: {
        images: [
            {
                url: "https://res.cloudinary.com/barthkosi/image/upload/v3-explorations-og.webp",
            },
        ],
    },
};

export default async function ExplorationsPage() {
    const explorations = await getContent('explorations');
    const tags = getAllTags(explorations);

    return <ExplorationsContent initialExplorations={explorations} allTags={tags} />;
}
