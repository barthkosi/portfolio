import type { MetadataRoute } from "next";
import { getContentIndex } from "@/lib/content-store";
import { CONTENT_CATEGORIES } from "@/lib/content-types";
import { NAV_TABS, tabToPath } from "@/lib/navigation";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const index = await getContentIndex();

  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: index.updatedAt },
    ...NAV_TABS.map((tab) => ({ url: `${SITE_URL}${tabToPath(tab)}` })),
  ];

  const posts: MetadataRoute.Sitemap = CONTENT_CATEGORIES.flatMap((category) =>
    index[category].map((post) => ({
      url: `${SITE_URL}/${category}/${post.slug}`,
      lastModified: post.updatedAt,
    })),
  );

  return [...pages, ...posts];
}
