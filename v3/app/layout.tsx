import type { Metadata, Viewport } from "next";
import { DM_Sans, Inter } from "next/font/google";
import { DisablePinchZoom } from "@/components/DisablePinchZoom";
import { DEFAULT_THEME_COLOR } from "@/lib/theme";
import "./globals.css";

const headingFont = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-heading",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Barth",
  description: "Barth is a design engineer building beautiful and intuitive digital products.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: DEFAULT_THEME_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`bg-background-primary ${headingFont.variable} ${bodyFont.variable}`}
    >
      <body className="antialiased">
        <DisablePinchZoom />
        <div id="app-scroll" className="app-scroll">
          {children}
        </div>
      </body>
    </html>
  );
}
