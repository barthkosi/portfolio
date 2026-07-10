import { Metadata } from "next";
import IllustrationsContent from "@/components/pages/IllustrationsContent";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Illustrations",
  description:
    "A visual diary of forms. I believe only in continued iteration.",
  alternates: {
    canonical: `${SITE_URL}/illustrations`,
  },
  openGraph: {
    title: "Illustrations by Barth Kosi",
    description:
      "A visual diary of forms. I believe only in continued iteration.",
    images: [
      {
        url: "https://res.cloudinary.com/barthkosi/image/upload/v1780760350/og/illustrations.png",
      },
    ],
  },
};

export default function IllustrationsPage() {
  return <IllustrationsContent />;
}
