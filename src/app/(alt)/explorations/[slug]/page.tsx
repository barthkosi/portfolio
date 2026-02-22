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
        title: post.title,
        description: post.description,
        alternates: {
            canonical: `https://www.barthkosi.com/explorations/${slug}`,
        },
        openGraph: {
            images: [post.coverImage || post.bannerImage || ""]
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

    const currentIndex = allPosts.findIndex(p => p.slug === slug);
    const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
    const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;

    return <PostContent
        post={post}
        otherPosts={otherPosts}
        type="explorations"
        prevPost={prevPost ? { slug: prevPost.slug, title: prevPost.title } : null}
        nextPost={nextPost ? { slug: nextPost.slug, title: nextPost.title } : null}
    />;
}
