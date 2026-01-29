import { Metadata } from "next";
import HomeContent from "@/components/pages/HomeContent";

export const metadata: Metadata = {
    title: "barthkosi - design & engineering",
    description: "Barth creates visual systems and digital experiences. Explore my portfolio of web interactions, engineered solutions, and dynamic motion design.",
    openGraph: {
        type: "website",
        url: "https://barthkosi.xyz",
        title: "barthkosi - design & engineering",
        description: "Design & Development",
        images: [{ url: "https://res.cloudinary.com/barthkosi/image/upload/opengraph.webp" }],
    },
    twitter: {
        card: "summary_large_image",
        description: "Design & Development",
        title: "barthkosi - design & engineering",
        images: ["https://res.cloudinary.com/barthkosi/image/upload/opengraph.webp"],
    },
};

export default function Home() {
    return <HomeContent />;
}
