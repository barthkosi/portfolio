import { Metadata } from "next";
import ArchiveContent from "@/components/pages/ArchiveContent";

export const metadata: Metadata = {
    title: "Archive",
    description: "A comprehensive archive of my work and experiments.",
    alternates: {
        canonical: "https://www.barthkosi.com/archive",
    },
    openGraph: {
        images: [
            {
                url: "https://res.cloudinary.com/barthkosi/image/upload/v3-archive-og.png",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        images: ["https://res.cloudinary.com/barthkosi/image/upload/v3-archive-og.png"],
    },
};

export default function ArchivePage() {
    return <ArchiveContent />;
}
