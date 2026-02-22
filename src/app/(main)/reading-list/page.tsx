import { Metadata } from "next";
import ReadingListContent from "@/components/pages/ReadingListContent";

export const metadata: Metadata = {
    title: "Reading List",
    description: "Reading more is one of my biggest goals. This list shifts and grows as new titles find their way into my hands",
    alternates: {
        canonical: "https://www.barthkosi.com/reading-list",
    },
    openGraph: {
        images: [
            {
                url: "https://res.cloudinary.com/barthkosi/image/upload/v3-reading-list-og.webp",
            },
        ],
    },
};

export default function ReadingListPage() {
    return <ReadingListContent />;
}
