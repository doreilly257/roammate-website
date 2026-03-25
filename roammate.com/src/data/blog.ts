export type BlogSection = {
  heading: string;
  content: string | string[];
  image: string;
  imageAlt?: string;
  kicker?: string;
  quote?: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readMinutes: number;
  heroImage: string;
  intro: string;
  sections: BlogSection[];
  relatedPosts: string[];
  publishedAt?: string;
  updatedAt?: string;
  author?: string;
  readingTime?: string;
  relatedGuideSlugs?: string[];
  relatedPostSlugs?: string[];
  cities?: string[];
};
