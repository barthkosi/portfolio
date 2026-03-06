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
        title: post.title,
        description: post.description,
        alternates: {
            canonical: `https://www.barthkosi.com/writing/${slug}`,
        },
        openGraph: {
            images: [post.coverImage || post.bannerImage || ""]
        }
    };
}

export default async function WritingPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getPostBySlug('writing', slug);
    const allPosts = await getContent('writing');

    if (!post || post.locked) {
        notFound();
    }

    const otherPosts = allPosts.filter(p => p.slug !== slug).slice(0, 3);

    const navigablePosts = allPosts.filter(p => !p.locked);
    const currentIndex = navigablePosts.findIndex(p => p.slug === slug);
    const prevPost = currentIndex > 0 ? navigablePosts[currentIndex - 1] : null;
    const nextPost = currentIndex < navigablePosts.length - 1 ? navigablePosts[currentIndex + 1] : null;

    return <PostContent
        post={post}
        otherPosts={otherPosts}
        type="writing"
        prevPost={prevPost ? { slug: prevPost.slug, title: prevPost.title } : null}
        nextPost={nextPost ? { slug: nextPost.slug, title: nextPost.title } : null}
    />;
}
