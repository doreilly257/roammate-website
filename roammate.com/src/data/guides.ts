import { getCollection } from 'astro:content';

export type GuideEntry = {
  slug: string;
  name: string;
  country: string;
  flag: string;
  region: string;
};

export type RouteEntry = {
  slug: string;
  name: string;
  flags: string;
  duration: string;
  tagline: string;
};

// City guide slugs — used to distinguish city guides from place guides.
// Both use type:'city' in the content collection; this set identifies which are "city" guides.
const CITY_GUIDE_SLUGS_LIST = [
  "abu-dhabi","accra","addis-ababa","agra","aguas-calientes","amman","amritsar","amsterdam",
  "antalya","antigua-guatemala","aqaba","arequipa","arusha","aswan","athens","auckland",
  "bangkok","banos","barcelona","bariloche","beijing","berat","berlin","bhaktapur","bishkek",
  "bogota","bologna","brussels","budapest","buenos-aires","bukhara","busan","byron-bay",
  "cairns","cairo","cancun","cape-coast","cape-town","cartagena","cebu","chefchaouen",
  "chiang-mai","chiang-rai","christchurch","colombo","copenhagen","cusco","da-nang","dahab",
  "dakar","dar-es-salaam","delhi","denpasar","doha","dubai","dublin","dubrovnik","durban",
  "edinburgh","el-calafate","el-chalten","elmina","entebbe","essaouira","fes","fethiye",
  "florence","frankfurt","fukuoka","galle","gjirokaster","goreme","granada-nicaragua",
  "granada-spain","guangzhou","gyeongju","hampi","hanoi","haridwar","havana","helsinki",
  "heraklion","hiroshima","ho-chi-minh-city","hong-kong","honolulu","hue","imlil","istanbul",
  "jaipur","jerash","jerusalem","jinja","jodhpur","johor-bahru","kamakura","kampala","kampot",
  "kandy","kathmandu","kigali","knysna","koh-lanta","kolkata","kota-kinabalu","krakow","ksamil",
  "kuala-lumpur","kumasi","kuta-lombok","kyoto","la-paz","lamu","las-vegas","leon-nicaragua",
  "lima","lisbon","livingstone","london","los-angeles","luang-prabang","luxor","macau","madrid",
  "manali","manila","marne-la-vallee","marrakech","marseille","maun","mecca","medellin","medina",
  "melbourne","mendoza","merzouga","mexico-city","miami","milan","minca","mombasa","montreal",
  "mumbai","munich","muscat","nairobi","nara","new-york-city","nha-trang","nice","nizwa",
  "nuwara-eliya","oaxaca","orlando","osaka","oslo","otavalo","palma-de-mallorca","panama-city",
  "paris","pattaya-chonburi","penang","phnom-penh","phuket","pokhara","porto","prague",
  "puerto-princesa","puno","punta-cana","queenstown","quito","rhodes","rio-de-janeiro",
  "rishikesh","riyadh","rome","rotorua","saint-louis-senegal","salento","san-cristobal",
  "san-francisco","san-pedro-de-atacama","santiago","sao-paulo","sapa","sapporo","seoul",
  "seville","shanghai","sharjah","shenzhen","siem-reap","siena","singapore","split","stockholm",
  "stone-town","sur","swakopmund","sydney","taipei","tallinn","tamale","tangier","tbilisi",
  "tel-aviv","thessaloniki","tirana","tokyo","toronto","udaipur","unawatuna","ushuaia","valencia",
  "valparaiso","vancouver","venice","verona","vienna","vientiane","vilnius","walvis-bay","wanaka",
  "warsaw","washington-dc","wellington","windhoek","yogyakarta","zhuhai","ziguinchor","zurich",
] as const;

let _cache: {
  allGuides: GuideEntry[];
  cityGuideSlugs: Set<string>;
  backpackerRoutes: RouteEntry[];
  guideToRoutes: Record<string, string[]>;
} | null = null;

async function loadGuides() {
  if (_cache) return _cache;

  const entries = await getCollection('guides');
  const citySlugSet = new Set<string>(CITY_GUIDE_SLUGS_LIST);

  const cityTypeEntries = entries.filter((e) => e.data.type === 'city');
  const routeEntries = entries.filter((e) => e.data.type === 'backpacker');

  const collatorOpts: Intl.CollatorOptions = { sensitivity: 'base' };

  const allGuideEntries: GuideEntry[] = cityTypeEntries
    .map((e) => ({
      slug: e.data.slug,
      name: e.data.heroCity,
      country: e.data.heroCountry,
      flag: e.data.heroFlag,
      region: e.data.heroRegion,
    }))
    .sort((a, b) => {
      const c = a.country.localeCompare(b.country, undefined, collatorOpts);
      return c !== 0 ? c : a.name.localeCompare(b.name, undefined, collatorOpts);
    });

  const backpackerRoutes: RouteEntry[] = routeEntries.map((e) => ({
    slug: e.data.slug,
    name: e.data.heroTitle.replace(/<br\s*\/?>/g, ' '),
    flags: e.data.heroFlags,
    duration: e.data.heroPills?.[0] ?? '',
    tagline: e.data.heroSubtitle,
  }));

  const guideToRoutes: Record<string, string[]> = {};
  for (const route of routeEntries) {
    const slugs = route.data.featuredGuides ?? [];
    for (const guideSlug of slugs) {
      if (!guideToRoutes[guideSlug]) guideToRoutes[guideSlug] = [];
      guideToRoutes[guideSlug].push(route.data.slug);
    }
  }

  _cache = { allGuides: allGuideEntries, cityGuideSlugs: citySlugSet, backpackerRoutes, guideToRoutes };
  return _cache;
}

export async function getAllGuides(): Promise<GuideEntry[]> {
  return (await loadGuides()).allGuides;
}

export async function getCityGuideSlugs(): Promise<Set<string>> {
  return (await loadGuides()).cityGuideSlugs;
}

export async function getBackpackerRoutes(): Promise<RouteEntry[]> {
  return (await loadGuides()).backpackerRoutes;
}

export async function getBySlug(slugs: string[]): Promise<GuideEntry[]> {
  const { allGuides } = await loadGuides();
  const map = new Map(allGuides.map((g) => [g.slug, g]));
  return slugs.flatMap((s) => (map.has(s) ? [map.get(s)!] : []));
}

export async function getRelated(
  currentSlug: string,
  region: string,
  count = 6,
): Promise<GuideEntry[]> {
  const { allGuides } = await loadGuides();
  const pool = allGuides.filter(
    (g) => g.region === region && g.slug !== currentSlug,
  );
  const hash = currentSlug
    .split('')
    .reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  const offset = Math.abs(hash) % Math.max(1, pool.length - count + 1);
  return pool.slice(offset, offset + count);
}

export async function getRoutes(guideSlug: string): Promise<RouteEntry[]> {
  const { backpackerRoutes, guideToRoutes } = await loadGuides();
  const routeMap = new Map(backpackerRoutes.map((r) => [r.slug, r]));
  return (guideToRoutes[guideSlug] ?? []).flatMap((s) =>
    routeMap.has(s) ? [routeMap.get(s)!] : [],
  );
}
