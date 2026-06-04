import Button from "@/components/interface/Button";
import Footer from "@/components/interface/Footer";
import Nav from "@/components/interface/Nav";
import Image from "next/image";
import { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
    title: "404",
    description: "Oops! The page you're looking for doesn't exist. It might have been moved or deleted.",
    alternates: {
        canonical: `${SITE_URL}/404`,
    },
};

export default function NotFound() {
    return (
        <div className="flex flex-col items-center min-h-screen">
            <Nav />
            <main className="flex-1 mx-auto max-w-[1440px] p-4 md:p-8 w-full">
                <div className="w-full flex flex-col lg:flex-row gap-8 lg:gap-0 items-center justify-center min-h-[calc(100vh-96px)] lg:min-h-[calc(100vh-166px)] text-[var(--content-primary)]">
                    <Image
                        src="https://res.cloudinary.com/barthkosi/image/upload/portfolio-404.avif"
                        alt="404"
                        width={900}
                        height={600}
                        className="w-full lg:w-2/3 h-auto lg:-ml-[96px]"
                        priority
                    />
                    <section className="w-full lg:w-1/3 flex flex-col items-start">
                        <h1 className="h2 mb-4">Page Not Found</h1>
                        <p className="body-l mb-8 max-w-md">
                            Oops! The page you&apos;re looking for doesn&apos;t exist. It might have been moved or deleted.
                        </p>
                        <Button to="/" variant="secondary">
                            Go to Home
                        </Button>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
