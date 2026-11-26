import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HomeClient } from "@/components/interface/HomeClient";
import { pathToTab, tabToPath } from "@/lib/navigation";

export function generateStaticParams() {
  return [
    { tab: "work" },
    { tab: "explorations" },
    { tab: "writing" },
    { tab: "illustrations" },
    { tab: "contact" },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string }>;
}): Promise<Metadata> {
  const { tab } = await params;
  const matchedTab = pathToTab(`/${tab}`);
  if (!matchedTab) {
    return {};
  }

  return {
    alternates: {
      canonical: tabToPath(matchedTab),
    },
  };
}

export default async function TabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  const matchedTab = pathToTab(`/${tab}`);

  if (!matchedTab) {
    redirect("/");
  }

  return <HomeClient initialTab={matchedTab} />;
}
