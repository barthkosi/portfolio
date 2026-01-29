import { Metadata } from "next";
import { getPostBySlug, getContent } from "@/lib/content";
import PostContent from "@/components/pages/PostContent";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
    const posts = await getContent('explorations');
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPostBySlug('explorations', slug);
    if (!post) return {};

    return {
        title: `barthkosi - ${post.title.toLowerCase()}`,
        description: post.description,
        openGraph: {
            images: [post.bannerImage || post.coverImage || ""]
        }
    };
}

export default async function ExplorationPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getPostBySlug('explorations', slug);
    const allPosts = await getContent('explorations');

    if (!post) {
        notFound();
    }

    const otherPosts = allPosts.filter(p => p.slug !== slug).slice(0, 3);

    return <PostContent post={post} otherPosts={otherPosts} type="explorations" />;
}
