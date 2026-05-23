import { Metadata } from "next";
import HomeContent from "@/components/pages/HomeContent";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
    title: "Design & Engineering",
    description: "Barth Kosi creates visual systems and digital experiences. Explore my portfolio of web interactions, engineered solutions, and dynamic motion design.",
    alternates: {
        canonical: SITE_URL,
    },
    openGraph: {
        type: "website",
        url: SITE_URL,
        title: "Barth Kosi - Design & Engineering",
        description: "Barth Kosi creates visual systems and digital experiences. Explore my portfolio of web interactions, engineered solutions, and dynamic motion design.",
        images: [{ url: "https://res.cloudinary.com/barthkosi/image/upload/opengraph.avif" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Barth Kosi - Design & Engineering",
        description: "Barth Kosi creates visual systems and digital experiences. Explore my portfolio of web interactions, engineered solutions, and dynamic motion design.",
        images: ["https://res.cloudinary.com/barthkosi/image/upload/opengraph.avif"],
    },
};

export default function Home() {
    return (
        <div className="-m-4 md:-m-8">
            <HomeContent />
        </div>
    );
}
