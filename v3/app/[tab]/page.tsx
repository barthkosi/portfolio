import { redirect } from "next/navigation";
import { HomeClient } from "@/components/HomeClient";
import { pathToTab } from "@/lib/navigation";

export function generateStaticParams() {
  return [
    { tab: "work" },
    { tab: "explorations" },
    { tab: "writing" },
    { tab: "illustrations" },
    { tab: "contact" },
  ];
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
