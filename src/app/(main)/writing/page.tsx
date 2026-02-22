import { Metadata } from "next";
import { getContent, getAllTags } from "@/lib/content";
import WritingContent from "@/components/pages/WritingContent";

export const metadata: Metadata = {
    title: "Writing",
    description: "My internal monologues externalized, covering everything from tech to the messy human condition.",
    alternates: {
        canonical: "https://www.barthkosi.com/writing",
    },
    openGraph: {
        images: [
            {
                url: "https://res.cloudinary.com/barthkosi/image/upload/v3-writing-og.webp",
            },
        ],
    },
};

export default async function WritingPage() {
    const posts = await getContent('writing');
    const tags = getAllTags(posts);

    return <WritingContent initialPosts={posts} allTags={tags} />;
}
