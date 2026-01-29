import { Metadata } from "next";
import { getPostBySlug, getContent } from "@/lib/content";
import PostContent from "@/components/pages/PostContent";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
    const posts = await getContent('work');
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPostBySlug('work', slug);
    if (!post) return {};

    return {
        title: `barthkosi - ${post.title.toLowerCase()}`,
        description: post.description,
        openGraph: {
            images: [post.coverImage || post.bannerImage || ""]
        }
    };
}

export default async function WorkPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getPostBySlug('work', slug);
    const allPosts = await getContent('work');

    if (!post) {
        notFound();
    }

    const otherPosts = allPosts.filter(p => p.slug !== slug).slice(0, 3);

    return <PostContent post={post} otherPosts={otherPosts} type="work" />;
}
