import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Inter } from "next/font/google";
import { DisablePinchZoom } from "@/components/DisablePinchZoom";
import { DEFAULT_THEME_COLOR } from "@/lib/theme";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const headingFont = Instrument_Sans({
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
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      {
        url: "/favicon-light.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
