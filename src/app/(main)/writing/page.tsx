import { Metadata } from "next";
import { getContent, getAllTags } from "@/lib/content";
import WritingContent from "@/components/pages/WritingContent";

export const metadata: Metadata = {
    title: "barthkosi - writing",
    description: "My internal monologues externalized, covering everything from tech to the messy human condition.",
};

export default async function WritingPage() {
    const posts = await getContent('writing');
    const tags = getAllTags(posts);

    return <WritingContent initialPosts={posts} allTags={tags} />;
}
