import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "barthkosi - 404",
    description: "Page Not Found",
};

export default function NotFound() {
    return (
        <div className="w-fill flex flex-col lg:flex-row gap-8 lg:gap-0 items-center justify-center h-[calc(100vh-96px)] lg:h-[calc(100vh-166px)] px-4 text-[var(--content-primary)]">
            <img
                src="https://res.cloudinary.com/barthkosi/image/upload/portfolio-404.webp"
                alt="404"
                className="w-full lg:w-2/3 h-auto -ml-[64px] lg:-ml-[96px]"
            />
            <div className="w-full lg:w-1/3 flex flex-col items-start">
                <h2 className="mb-4">Page Not Found</h2>
                <p className="body-l mb-8 max-w-md">
                    Oops! The page you&apos;re looking for doesn&apos;t exist. It might have been moved or deleted.
                </p>
                <Link href="/" className="label-m rounded-[var(--radius-md)] border-[0.44px] border-[var(--border-primary)] bg-[var(--background-secondary)] text-[var(--content-primary)] hover:bg-[var(--background-tertiary)] px-4 py-2 transition-colors">
                    Go to Home
                </Link>
            </div>
        </div>
    );
}
