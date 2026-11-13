import type { Metadata, Viewport } from "next";
import { DM_Sans, Inter } from "next/font/google";
import { DEFAULT_THEME_COLOR } from "@/lib/theme";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Barth",
  description: "Barth is a design engineer building beautiful and intuitive digital products.",
};

export const viewport: Viewport = {
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
      className="bg-background-primary"
      style={
        {
          "--font-family-heading": dmSans.style.fontFamily,
          "--font-family-body": inter.style.fontFamily,
          "--font-family-label": dmSans.style.fontFamily,
        } as React.CSSProperties
      }
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
