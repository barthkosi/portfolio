import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
