import { Metadata } from "next";
import ArchiveContent from "@/components/pages/ArchiveContent";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
    title: "Archive",
    description: "A comprehensive archive of my work and experiments.",
    alternates: {
        canonical: `${SITE_URL}/archive`,
    },
    openGraph: {
        title: "Archive by Barth Kosi",
        description: "A comprehensive archive of my work and experiments.",
        images: [{ url: "https://res.cloudinary.com/barthkosi/image/upload/v3-archive-og.avif" }],
    },
};

export default function ArchivePage() {
    return <ArchiveContent />;
}
