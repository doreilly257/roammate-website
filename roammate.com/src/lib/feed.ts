import type { GuideEntry } from "../data/guides";
import type { BlogPost } from "../data/blog";

type FeedItem = {
  title: string;
  link: string;
  description: string;
  pubDate: Date;
};

const backpackerRoutes = [
  {
    slug: "southeast-asia",
    name: "Southeast Asia Backpacker Route",
    desc: "Multi-month backpacker itinerary through Thailand, Vietnam, Cambodia, and Laos with budget tips and week-by-week plans.",
  },
  {
    slug: "europe",
    name: "Europe Backpacker Route",
    desc: "Backpacker route through Western and Southern Europe covering France, Italy, Spain, Croatia, and Greece.",
  },
  {
    slug: "south-america",
    name: "South America Backpacker Route",
    desc: "Epic overland route through Colombia, Ecuador, Peru, Bolivia, Chile, and Argentina with budget breakdowns.",
  },
  {
    slug: "central-america",
    name: "Central America Backpacker Route",
    desc: "Mexico to Panama backpacker trail with volcano hikes, ruins, surf towns, and jungle adventures.",
  },
  {
    slug: "india",
    name: "India, Nepal & Sri Lanka Backpacker Route",
    desc: "Subcontinent adventure from the Golden Triangle to the Himalayas and Sri Lankan beaches.",
  },
  {
    slug: "east-africa",
    name: "East Africa Backpacker Route",
    desc: "Safari, gorilla trekking, and island hopping through Kenya, Tanzania, Uganda, and Rwanda.",
  },
  {
    slug: "japan-south-korea",
    name: "Japan & South Korea Backpacker Route",
    desc: "Temple hopping, bullet trains, and street food from Tokyo to Busan.",
  },
  {
    slug: "australia-new-zealand",
    name: "Australia & New Zealand Backpacker Route",
    desc: "East Coast road trips, reef diving, and South Island adventures down under.",
  },
  {
    slug: "indonesia-philippines",
    name: "Indonesia & Philippines Backpacker Route",
    desc: "Island hopping from Bali to Komodo to El Nido with diving, surfing, and rice terraces.",
  },
  {
    slug: "morocco-west-africa",
    name: "Morocco & West Africa Backpacker Route",
    desc: "Medinas, desert treks, and coastal adventures through Morocco, Senegal, and Ghana.",
  },
];

const staticPages = [
  {
    slug: "",
    name: "roammate — Find Travel Companions",
    desc: "Find like-minded travel companions for your next adventure. Browse city guides, backpacker routes, and plan trips together.",
  },
  {
    slug: "guides",
    name: "Travel Guides Hub",
    desc: "Browse all city guides, place guides, and backpacker routes on roammate.",
  },
  {
    slug: "faq",
    name: "Frequently Asked Questions",
    desc: "Common questions about using roammate to find travel companions and plan trips.",
  },
  {
    slug: "privacy",
    name: "Privacy Policy",
    desc: "How roammate handles data and protects your privacy.",
  },
  {
    slug: "terms",
    name: "Terms of Service",
    desc: "Terms and conditions for using roammate.",
  },
];

function hashToUnit(slug: string): number {
  let hash = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return (hash >>> 0) / 0xffffffff;
}

function randomDate(slug: string, start: Date, end: Date): Date {
  const ratio = hashToUnit(slug);
  const ms = start.getTime() + ratio * (end.getTime() - start.getTime());
  return new Date(ms);
}

const dateStart = new Date("2023-01-01T00:00:00.000Z");

export function getFeedItems(
  allGuides: GuideEntry[],
  cityGuideSlugs: Set<string>,
  allBlogPosts: BlogPost[] = [],
): FeedItem[] {
  const dateEnd = new Date();

  const guideItems = allGuides.map((g) => {
    const isCity = cityGuideSlugs.has(g.slug);
    const typeLabel = isCity ? "City Guide" : "Place Guide";
    return {
      title: `${g.flag} ${g.name} ${typeLabel} — ${g.country}`,
      link: `/guides/${g.slug}/`,
      description: `${typeLabel} for ${g.name}, ${g.country}. Itineraries, budget tips, and local advice for travellers.`,
      pubDate: randomDate(g.slug, dateStart, dateEnd),
    };
  });

  const routeItems = backpackerRoutes.map((r) => ({
    title: `${r.name} — Multi-Month Itinerary`,
    link: `/guides/${r.slug}/`,
    description: r.desc,
    pubDate: randomDate(r.slug, dateStart, dateEnd),
  }));

  const staticItems = staticPages.map((p) => ({
    title: p.name,
    link: p.slug ? `/${p.slug}/` : "/",
    description: p.desc,
    pubDate: randomDate(p.slug || "home", dateStart, dateEnd),
  }));

  const blogItems = allBlogPosts.map((post) => ({
    title: `📝 ${post.title}`,
    link: `/blog/${post.slug}/`,
    description: post.description,
    pubDate: post.publishedAt
      ? new Date(post.publishedAt)
      : randomDate(post.slug, dateStart, dateEnd),
  }));

  return [...staticItems, ...routeItems, ...guideItems, ...blogItems].sort(
    (a, b) => b.pubDate.getTime() - a.pubDate.getTime(),
  );
}
