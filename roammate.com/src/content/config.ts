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

const quickFact = z.object({ icon: z.string(), label: z.string(), value: z.string(), detail: z.string() });
const period = z.object({ time: z.string(), icon: z.string(), title: z.string(), text: z.string(), tip: z.string().optional() });
const itineraryDay = z.object({ num: z.number(), title: z.string(), periods: z.array(period) });
const budgetTip = z.union([z.object({ title: z.string(), text: z.string() }), z.string()]);
const budgetRow = z.object({ category: z.string(), budget: z.string(), midrange: z.string().optional(), mid: z.string().optional(), splurge: z.string().optional(), notes: z.string().optional() });
const practicalItem = z.object({ icon: z.string(), title: z.string(), items: z.array(z.string()) });
const culturalTip = z.union([z.object({ icon: z.string(), title: z.string(), text: z.string() }), z.string()]);

const cityGuideSchema = z.object({
  type: z.literal('city'),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  heroImage: z.string(),
  heroFlag: z.string(),
  heroCountry: z.string(),
  heroRegion: z.string(),
  heroCity: z.string(),
  heroSubtitle: z.string(),
  heroPills: z.array(z.string()),
  defaultDays: z.number(),
  quickFacts: z.array(quickFact),
  itineraries: z.record(z.string(), z.array(itineraryDay)),
  budgetIntro: z.string(),
  budgetTips: z.array(budgetTip),
  budgetBreakdown: z.array(budgetRow),
  practicalInfo: z.array(practicalItem),
  culturalIntro: z.string(),
  culturalTips: z.array(culturalTip),
  ctaCity: z.string(),
  ctaText: z.string(),
  ctaCustomise: z.string(),
});

const routePhase = z.object({ title: z.string(), duration: z.string(), description: z.string(), tip: z.string().optional(), guides: z.array(z.string()).optional() });
const routeCountry = z.object({
  name: z.string(), flag: z.string(), weeks: z.string(), color: z.string(), intro: z.string(),
  quickFacts: z.array(quickFact).optional(),
  phases: z.array(routePhase),
});
const routeOverviewItem = z.object({ country: z.string(), flag: z.string(), weeks: z.string(), color: z.string(), stops: z.array(z.string()) });
const routeBudgetColumn = z.object({ flag: z.string(), label: z.string() });
const routeBudgetRow = z.object({ category: z.string(), values: z.array(z.string()), notes: z.string() });

const backpackerRouteSchema = z.object({
  type: z.literal('backpacker'),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  heroImages: z.array(z.union([z.string(), z.object({ src: z.string(), alt: z.string() })])),
  heroFlags: z.string(),
  heroRegion: z.string(),
  heroTitle: z.string(),
  heroSubtitle: z.string(),
  heroPills: z.array(z.string()),
  accentColor: z.string(),
  routeOverview: z.array(routeOverviewItem),
  countries: z.array(routeCountry),
  budgetIntro: z.string(),
  budgetColumns: z.array(routeBudgetColumn),
  budgetRows: z.array(routeBudgetRow),
  practicalInfo: z.array(practicalItem),
  featuredGuides: z.array(z.string()).optional(),
  ctaRegion: z.string(),
  ctaText: z.string(),
  ctaCustomise: z.string(),
});

const guides = defineCollection({
  type: 'data',
  schema: z.discriminatedUnion('type', [cityGuideSchema, backpackerRouteSchema]),
});

export const collections = { blog, guides };
