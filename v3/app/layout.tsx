import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Inter } from "next/font/google";
import { PageTransitionProvider } from "@/components/interface/PageTransition";
import { DisablePinchZoom } from "@/components/logic/DisablePinchZoom";
import { DEFAULT_THEME_COLOR } from "@/lib/theme";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_URL,
  SOCIAL_LINKS,
} from "@/lib/site";
import "@/styles/globals.css";

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
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: SITE_OG_IMAGE,
        width: 1200,
        height: 631,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
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

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE_NAME,
  url: SITE_URL,
  jobTitle: "Design Engineer",
  description: SITE_DESCRIPTION,
  sameAs: SOCIAL_LINKS.map((link) => link.href),
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <DisablePinchZoom />
        <PageTransitionProvider>
          <div id="app-scroll" className="app-scroll">
            {children}
          </div>
        </PageTransitionProvider>
      </body>
    </html>
  );
}
