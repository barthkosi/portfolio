import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BlogPostRenderer } from "@/components/interface/BlogPostRenderer";
import { getPostBySlug } from "@/lib/content-store";
import { isContentCategory } from "@/lib/content-types";
import { SITE_NAME, SITE_OG_IMAGE } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab: string; slug: string }>;
}): Promise<Metadata> {
  const { tab, slug } = await params;
  const category = tab.toLowerCase();
  if (!isContentCategory(category)) {
    return {};
  }

  const post = await getPostBySlug(category, slug);
  if (!post) {
    return {};
  }

  const socialImage = post.meta.coverImage || SITE_OG_IMAGE;

  return {
    title: post.meta.title,
    description: post.meta.description || undefined,
    alternates: {
      canonical: `/${category}/${post.meta.slug}`,
    },
    openGraph: {
      title: post.meta.title,
      description: post.meta.description || undefined,
      images: post.meta.coverImage
        ? [post.meta.coverImage]
        : [
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
      title: post.meta.title,
      description: post.meta.description || undefined,
      images: [socialImage],
    },
  };
}

export default async function ContentPostPage({
  params,
}: {
  params: Promise<{ tab: string; slug: string }>;
}) {
  const { tab, slug } = await params;
  const category = tab.toLowerCase();

  if (!isContentCategory(category)) {
    redirect("/");
  }

  const post = await getPostBySlug(category, slug);
  if (!post) {
    redirect("/");
  }

  return <BlogPostRenderer post={post} />;
}
