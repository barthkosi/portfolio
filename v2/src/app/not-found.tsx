import Footer from "@/components/interface/Footer";
import Nav from "@/components/interface/Nav";
import NotFoundContent from "@/components/pages/NotFoundContent";
import { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "404",
  description:
    "Oops! The page you're looking for doesn't exist. It might have been moved or deleted.",
  alternates: {
    canonical: `${SITE_URL}/404`,
  },
};

// Unmatched URLs render here inside the root layout only, so this page brings
// its own Nav and Footer. notFound() calls from post pages hit
// (alt)/not-found.tsx instead, which reuses the (alt) layout's chrome.
export default function NotFound() {
  return (
    <div className="flex flex-col items-center min-h-screen">
      <Nav />
      <main className="flex-1 mx-auto max-w-[1440px] p-4 md:p-8 w-full">
        <NotFoundContent />
      </main>
      <Footer />
    </div>
  );
}
