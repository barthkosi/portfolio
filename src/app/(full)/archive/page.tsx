import { Metadata } from "next";
import ArchiveContent from "@/components/pages/ArchiveContent";

export const metadata: Metadata = {
    title: "barthkosi - archive",
    description: "A comprehensive archive of my work and experiments.",
};

export default function ArchivePage() {
    return <ArchiveContent />;
}
