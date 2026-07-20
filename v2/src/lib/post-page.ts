import type { Metadata } from "next";
import { getContent, type ContentItem, type ContentType } from "@/lib/content";
import {
  getCloudinaryVideoThumbnailSrc,
  isCloudinaryVideoUrl,
} from "@/lib/image-urls";
import { SITE_URL } from "@/lib/site";

export interface PostPageData {
  post: ContentItem;
  otherPosts: ContentItem[];
  prevPost: { slug: string; title: string } | null;
  nextPost: { slug: string; title: string } | null;
}

const getCanonicalPath = (type: ContentType, slug: string) =>
  `/${type}/${slug}`;

export function getStaticParams(type: ContentType) {
  return getContent(type).map(({ slug }) => ({ slug }));
}

export function getPostMetadata(type: ContentType, slug: string): Metadata {
  const post = getContent(type).find((item) => item.slug === slug);

  if (!post) {
    return {};
  }

  const image = post.coverImage || post.bannerImage;
  const socialImage =
    image && isCloudinaryVideoUrl(image)
      ? getCloudinaryVideoThumbnailSrc(image)
      : image;

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `${SITE_URL}${getCanonicalPath(type, slug)}`,
    },
    openGraph: socialImage
      ? {
          images: [{ url: socialImage }],
        }
      : undefined,
    twitter: socialImage
      ? {
          card: "summary_large_image",
          images: [socialImage],
        }
      : undefined,
  };
}

export function getPostPageData(
  type: ContentType,
  slug: string,
): PostPageData | null {
  const posts = getContent(type);
  const post = posts.find((item) => item.slug === slug);

  if (!post || post.locked) {
    return null;
  }

  const visiblePosts = posts.filter((item) => !item.locked);
  const currentIndex = visiblePosts.findIndex((item) => item.slug === slug);

  return {
    post,
    otherPosts: visiblePosts.filter((item) => item.slug !== slug).slice(0, 3),
    prevPost:
      currentIndex > 0
        ? {
            slug: visiblePosts[currentIndex - 1].slug,
            title: visiblePosts[currentIndex - 1].title,
          }
        : null,
    nextPost:
      currentIndex >= 0 && currentIndex < visiblePosts.length - 1
        ? {
            slug: visiblePosts[currentIndex + 1].slug,
            title: visiblePosts[currentIndex + 1].title,
          }
        : null,
  };
}
