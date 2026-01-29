import { Metadata } from "next";
import IllustrationsContent from "@/components/pages/IllustrationsContent";

export const metadata: Metadata = {
    title: "barthkosi - illustrations",
    description: "A visual diary of forms. I believe only in continued iteration.",
};

export default function IllustrationsPage() {
    return <IllustrationsContent />;
}
