import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Manrope, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import ScrollToTop from "@/components/ScrollToTop";
import { ThemeProvider } from "@/components/ThemeProvider";
import DisableZoom from "@/components/DisableZoom";
import ContextMenu from "@/components/interface/ContextMenu";
import {
    SITE_DESCRIPTION,
    SITE_NAME,
    SITE_OG_IMAGE,
    SITE_TITLE,
    SITE_URL,
} from "@/lib/site";
import { Analytics } from "@vercel/analytics/next";

const instrumentSans = Instrument_Sans({
    subsets: ["latin"],
    variable: "--font-instrument-sans",
    weight: ["400", "500", "600", "700"],
    display: "swap",
});

const manrope = Manrope({
    subsets: ["latin"],
    variable: "--font-manrope",
    weight: ["400", "500", "600", "700", "800"],
    display: "swap",
});

const sourceSerif4 = Source_Serif_4({
    subsets: ["latin"],
    variable: "--font-source-serif",
    weight: ["400", "500", "600", "700"],
    display: "swap",
});

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: SITE_TITLE,
        template: `%s by ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    keywords: [
        "product design",
        "frontend developer",
        "design engineer",
        "creative engineering",
        "interactive design",
        "UI design",
        "motion design",
        "web design",
        "portfolio",
        "Barth Kosi",
        "barthkosi",
    ],
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    openGraph: {
        type: "website",
        url: SITE_URL,
        siteName: SITE_NAME,
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        images: [
            {
                url: SITE_OG_IMAGE,
                width: 1200,
                height: 630,
                alt: SITE_TITLE,
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        images: [SITE_OG_IMAGE],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
        },
    },
    alternates: {
        canonical: SITE_URL,
    },
    icons: {
        icon: [
            {
                media: "(prefers-color-scheme: light)",
                url: "https://res.cloudinary.com/barthkosi/image/upload/favicon-light.png",
                href: "https://res.cloudinary.com/barthkosi/image/upload/favicon-light.png",
            },
            {
                media: "(prefers-color-scheme: dark)",
                url: "https://res.cloudinary.com/barthkosi/image/upload/favicon-dark.png",
                href: "https://res.cloudinary.com/barthkosi/image/upload/favicon-dark.png",
            },
        ],
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${instrumentSans.variable} ${manrope.variable} ${sourceSerif4.variable}`}
            suppressHydrationWarning
        >
            <body className="antialiased bg-[var(--background-primary)] text-[var(--content-primary)]">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <ContextMenu />
                    <ScrollToTop />
                    <DisableZoom />
                    <SmoothScrollProvider>{children}</SmoothScrollProvider>
                </ThemeProvider>
                <Analytics />
            </body>
        </html>
    );
}
