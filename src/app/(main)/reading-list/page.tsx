import { Metadata } from "next";
import ReadingListContent from "@/components/pages/ReadingListContent";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
    title: "Reading List",
    description: "Reading more is one of my biggest goals. This list shifts and grows as new titles find their way into my hands.",
    alternates: {
        canonical: `${SITE_URL}/reading-list`,
    },
    openGraph: {
        title: "Reading List | Barth Kosi",
        description: "Reading more is one of my biggest goals. This list shifts and grows as new titles find their way into my hands.",
        images: [{ url: "https://res.cloudinary.com/barthkosi/image/upload/v3-reading-list-og.avif" }],
    },
};

export default function ReadingListPage() {
    return <ReadingListContent />;
}
