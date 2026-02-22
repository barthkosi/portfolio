import type { Metadata } from "next";
import { Instrument_Sans, Manrope, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import ScrollToTop from "@/components/ScrollToTop";

// Configure fonts
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
  metadataBase: new URL("https://www.barthkosi.com"),
  title: {
    default: "Barth Kosi – Product Designer & Frontend Developer",
    template: "%s | Barth Kosi",
  },
  description: "Product designer and frontend developer crafting visual systems, web interactions, and motion design that injects joy into the digital world.",
  keywords: ["product design", "frontend developer", "UI design", "motion design", "web design", "portfolio", "Barth Kosi", "barthkosi"],
  authors: [{ name: "Barth Kosi", url: "https://www.barthkosi.com" }],
  openGraph: {
    type: "website",
    url: "https://www.barthkosi.com",
    siteName: "Barth Kosi",
    title: "Barth Kosi – Product Designer & Frontend Developer",
    description: "Product designer and frontend developer crafting visual systems, web interactions, and motion design that injects joy into the digital world.",
    images: [
      {
        url: "https://res.cloudinary.com/barthkosi/image/upload/opengraph.webp",
        width: 1200,
        height: 630,
        alt: "Barth Kosi – Product Designer & Frontend Developer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Barth Kosi – Product Designer & Frontend Developer",
    description: "Product designer and frontend developer crafting visual systems, web interactions, and motion design that injects joy into the digital world.",
    images: ["https://res.cloudinary.com/barthkosi/image/upload/opengraph.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  alternates: {
    canonical: "https://www.barthkosi.com",
  },
  icons: {
    icon: [
      {
        media: '(prefers-color-scheme: light)',
        url: 'https://res.cloudinary.com/barthkosi/image/upload/favicon-light.png',
        href: 'https://res.cloudinary.com/barthkosi/image/upload/favicon-light.png',
      },
      {
        media: '(prefers-color-scheme: dark)',
        url: 'https://res.cloudinary.com/barthkosi/image/upload/favicon-dark.png',
        href: 'https://res.cloudinary.com/barthkosi/image/upload/favicon-dark.png',
      }
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${manrope.variable} ${sourceSerif4.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-[var(--background-primary)] text-[var(--content-primary)]">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ScrollToTop />
          <SmoothScrollProvider>
            {children}
          </SmoothScrollProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
