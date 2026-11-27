import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BlogPostRenderer } from "@/components/interface/BlogPostRenderer";
import { getPostBySlug } from "@/lib/content-store";
import { isContentCategory } from "@/lib/content-types";
import { SITE_NAME, SITE_OG_IMAGE } from "@/lib/site";

export const dynamic = "force-dynamic";

const VIDEO_EXT_RE = /\.(mp4|webm|mov)(\?.*)?$/i;

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

  const coverImage =
    post.meta.coverImage && !VIDEO_EXT_RE.test(post.meta.coverImage)
      ? post.meta.coverImage
      : null;
  const socialImage = coverImage ?? SITE_OG_IMAGE;

  return {
    title: post.meta.title,
    description: post.meta.description || undefined,
    alternates: {
      canonical: `/${category}/${post.meta.slug}`,
    },
    openGraph: {
      type: "article",
      url: `/${category}/${post.meta.slug}`,
      siteName: SITE_NAME,
      title: post.meta.title,
      description: post.meta.description || undefined,
      images: coverImage
        ? [
            {
              url: coverImage,
              ...(post.meta.coverWidth && post.meta.coverHeight
                ? {
                    width: post.meta.coverWidth,
                    height: post.meta.coverHeight,
                  }
                : {}),
              alt: post.meta.title,
            },
          ]
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
