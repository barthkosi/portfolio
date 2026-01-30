import { MetadataRoute } from 'next'
import { getContent } from '@/lib/content'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://barthkosi.xyz'

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${baseUrl}/work`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/writing`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/explorations`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/illustrations`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/reading-list`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/archive`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        },
    ]

    // Dynamic content pages
    const dynamicPages: MetadataRoute.Sitemap = []

    try {
        // Get all writing posts
        const writingPosts = getContent('writing')
        writingPosts.forEach((post) => {
            dynamicPages.push({
                url: `${baseUrl}/writing/${post.slug}`,
                lastModified: new Date(post.date),
                changeFrequency: 'weekly',
                priority: 0.7,
            })
        })

        // Get all explorations
        const explorations = getContent('explorations')
        explorations.forEach((post) => {
            dynamicPages.push({
                url: `${baseUrl}/explorations/${post.slug}`,
                lastModified: new Date(post.date),
                changeFrequency: 'weekly',
                priority: 0.7,
            })
        })
    } catch (error) {
        // If content loading fails, just return static pages
        console.error('Error loading dynamic content for sitemap:', error)
    }

    return [...staticPages, ...dynamicPages]
}

