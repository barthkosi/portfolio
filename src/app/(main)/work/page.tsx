import { Metadata } from "next";
import { getContent, getAllTags } from "@/lib/content";
import WorkContent from "@/components/pages/WorkContent";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
    title: "Work",
    description: "These entries document my process of building and refining tools that serve a purpose.",
    alternates: {
        canonical: `${SITE_URL}/work`,
    },
    openGraph: {
        title: "Work by Barth Kosi",
        description: "These entries document my process of building and refining tools that serve a purpose.",
        images: [{ url: "https://res.cloudinary.com/barthkosi/image/upload/v3-work-og.avif" }],
    },
};

export default async function WorkPage() {
    const projects = await getContent('work');
    const tags = getAllTags(projects);

    return <WorkContent initialProjects={projects} allTags={tags} />;
}
