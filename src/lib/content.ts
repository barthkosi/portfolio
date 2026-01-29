import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type ContentType = 'writing' | 'projects' | 'work' | 'explorations';

export interface ContentItem {
    slug: string;
    type: ContentType;
    title: string;
    date: string;
    description: string;
    coverImage?: string;
    bannerImage?: string;
    author?: string;
    tags?: string[];
    buttonText?: string;
    buttonLink?: string;
    content: string;
}

const contentDirectory = path.join(process.cwd(), 'src/content');

export const getContent = (type: ContentType): ContentItem[] => {
    const typeDir = path.join(contentDirectory, type);

    // Check if directory exists
    if (!fs.existsSync(typeDir)) {
        console.log(`[DEBUG] Directory not found: ${typeDir}`);
        return [];
    }

    const files = fs.readdirSync(typeDir).filter(file => file.endsWith('.md'));

    console.log(`[DEBUG] Loading ${type} content...`);
    console.log(`[DEBUG] Found Files:`, files);

    const items = files.map((filename) => {
        const filePath = path.join(typeDir, filename);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(fileContents);

        const slug = filename.replace('.md', '');

        return {
            slug,
            type,
            title: data.title || 'Untitled',
            date: data.date || new Date().toISOString(),
            description: data.description || '',
            coverImage: data.coverImage,
            bannerImage: data.bannerImage,
            author: data.author,
            tags: data.tags || [],
            buttonText: data.buttonText,
            buttonLink: data.buttonLink,
            content: content || '',
        } as ContentItem;
    });

    console.log(`[DEBUG] Total Items Loaded:`, items.length);

    // Sort by date descending
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getAllTags = (items: ContentItem[]): string[] => {
    const tags = new Set<string>();
    items.forEach(item => {
        item.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
};

export const getPostBySlug = (type: ContentType, slug: string): ContentItem | undefined => {
    const items = getContent(type);
    return items.find(item => item.slug === slug);
};

export const getAllSlugs = (type: ContentType): string[] => {
    const items = getContent(type);
    return items.map(item => item.slug);
};
