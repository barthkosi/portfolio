import { Metadata } from "next";
import IllustrationsContent from "@/components/pages/IllustrationsContent";

export const metadata: Metadata = {
    title: "Illustrations",
    description: "A visual diary of forms. I believe only in continued iteration.",
    alternates: {
        canonical: "https://www.barthkosi.com/illustrations",
    },
    openGraph: {
        images: [
            {
                url: "https://res.cloudinary.com/barthkosi/image/upload/v3-illustrations-og.webp",
            },
        ],
    },
};

export default function IllustrationsPage() {
    return <IllustrationsContent />;
}
