import { Metadata } from "next";
import { getContent, getAllTags } from "@/lib/content";
import WorkContent from "@/components/pages/WorkContent";

export const metadata: Metadata = {
    title: "barthkosi - work",
    description: "These entries document my process of building and refining tools that serve a purpose.",
};

export default async function WorkPage() {
    const projects = await getContent('work');
    const tags = getAllTags(projects);

    return <WorkContent initialProjects={projects} allTags={tags} />;
}
