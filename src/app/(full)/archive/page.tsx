import { Metadata } from "next";
import ArchiveContent from "@/components/pages/ArchiveContent";

export const metadata: Metadata = {
    title: "Archive",
    description: "A comprehensive archive of my work and experiments.",
    alternates: {
        canonical: "https://www.barthkosi.com/archive",
    },
};

export default function ArchivePage() {
    return <ArchiveContent />;
}
