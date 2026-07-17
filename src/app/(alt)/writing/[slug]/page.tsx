import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostContent from "@/components/pages/PostContent";
import {
  getPostMetadata,
  getPostPageData,
  getStaticParams,
} from "@/lib/post-page";

export function generateStaticParams() {
  return getStaticParams("writing");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return getPostMetadata("writing", slug);
}

export default async function WritingPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const postPageData = getPostPageData("writing", slug);

  if (!postPageData) {
    notFound();
  }

  return <PostContent {...postPageData} type="writing" />;
}
