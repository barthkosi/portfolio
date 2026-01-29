import { Metadata } from "next";
import { getPostBySlug, getContent } from "@/lib/content";
import PostContent from "@/components/pages/PostContent";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
    const posts = await getContent('writing');
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPostBySlug('writing', slug);
    if (!post) return {};

    return {
        title: `barthkosi - ${post.title.toLowerCase()}`,
        description: post.description,
        openGraph: {
            images: [post.coverImage || post.bannerImage || ""]
        }
    };
}

export default async function WritingPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getPostBySlug('writing', slug);
    const allPosts = await getContent('writing');

    if (!post) {
        notFound();
    }

    const otherPosts = allPosts.filter(p => p.slug !== slug).slice(0, 3);

    return <PostContent post={post} otherPosts={otherPosts} type="writing" />;
}
