import type { Metadata } from "next";
import { Instrument_Sans, Manrope, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { LoadingProvider } from "@/context/LoadingContext";
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
  title: "Bartholomew Kosi",
  description: "Product Designer & Frontend Developer",
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
          <LoadingProvider>
            <ScrollToTop />
            <SmoothScrollProvider>
              {children}
            </SmoothScrollProvider>
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
