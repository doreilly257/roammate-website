import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    readMinutes: z.number(),
    heroImage: z.string(),
    intro: z.string(),
    sections: z.array(z.object({
      heading: z.string(),
      content: z.union([z.string(), z.array(z.string())]),
      image: z.string().optional(),
      imageAlt: z.string().optional(),
      kicker: z.string().optional(),
      quote: z.string().optional(),
    })),
    relatedPosts: z.array(z.string()).optional(),
    publishedAt: z.string().optional(),
    updatedAt: z.string().optional(),
    author: z.string().optional(),
    readingTime: z.string().optional(),
    relatedGuideSlugs: z.array(z.string()).optional(),
    relatedPostSlugs: z.array(z.string()).optional(),
  }),
});

export const collections = { blog };
