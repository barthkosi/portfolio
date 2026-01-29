import { Metadata } from "next";
import ReadingListContent from "@/components/pages/ReadingListContent";

export const metadata: Metadata = {
    title: "barthkosi - reading list",
    description: "Reading more is one of my biggest goals. This list shifts and grows as new titles find their way into my hands",
};

export default function ReadingListPage() {
    return <ReadingListContent />;
}
