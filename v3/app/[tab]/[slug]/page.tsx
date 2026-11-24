import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BlogPostRenderer } from "@/components/BlogPostRenderer";
import { getPostBySlug } from "@/lib/content-store";
import { isContentCategory } from "@/lib/content-types";

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

  return {
    title: `${post.meta.title} | Barth`,
    description: post.meta.description || undefined,
    openGraph: {
      title: post.meta.title,
      description: post.meta.description || undefined,
      images: post.meta.coverImage ? [post.meta.coverImage] : undefined,
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
