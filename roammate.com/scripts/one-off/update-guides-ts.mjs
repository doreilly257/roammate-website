#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const guidesPath = join(import.meta.dirname, 'src/data/guides.ts');
let content = readFileSync(guidesPath, 'utf-8');

// New city guides to add
const newCities = [
  { slug: "amman", name: "Amman", country: "Jordan", flag: "🇯🇴", region: "Middle East" },
  { slug: "muscat", name: "Muscat", country: "Oman", flag: "🇴🇲", region: "Middle East" },
  { slug: "cape-town", name: "Cape Town", country: "South Africa", flag: "🇿🇦", region: "Africa" },
  { slug: "hue", name: "Hue", country: "Vietnam", flag: "🇻🇳", region: "Southeast Asia" },
  { slug: "da-nang", name: "Da Nang", country: "Vietnam", flag: "🇻🇳", region: "Southeast Asia" },
  { slug: "penang", name: "Penang", country: "Malaysia", flag: "🇲🇾", region: "Southeast Asia" },
  { slug: "yogyakarta", name: "Yogyakarta", country: "Indonesia", flag: "🇮🇩", region: "Southeast Asia" },
  { slug: "kigali", name: "Kigali", country: "Rwanda", flag: "🇷🇼", region: "Africa" },
  { slug: "havana", name: "Havana", country: "Cuba", flag: "🇨🇺", region: "Caribbean" },
  { slug: "udaipur", name: "Udaipur", country: "India", flag: "🇮🇳", region: "South Asia" },
  { slug: "hampi", name: "Hampi", country: "India", flag: "🇮🇳", region: "South Asia" },
  { slug: "kota-kinabalu", name: "Kota Kinabalu", country: "Malaysia", flag: "🇲🇾", region: "Southeast Asia" },
  { slug: "addis-ababa", name: "Addis Ababa", country: "Ethiopia", flag: "🇪🇹", region: "Africa" },
  { slug: "windhoek", name: "Windhoek", country: "Namibia", flag: "🇳🇦", region: "Africa" },
  { slug: "swakopmund", name: "Swakopmund", country: "Namibia", flag: "🇳🇦", region: "Africa" },
  { slug: "maun", name: "Maun", country: "Botswana", flag: "🇧🇼", region: "Africa" },
  { slug: "livingstone", name: "Livingstone", country: "Zambia", flag: "🇿🇲", region: "Africa" },
  { slug: "siena", name: "Siena", country: "Italy", flag: "🇮🇹", region: "Europe" },
  { slug: "aqaba", name: "Aqaba", country: "Jordan", flag: "🇯🇴", region: "Middle East" },
  { slug: "bukhara", name: "Bukhara", country: "Uzbekistan", flag: "🇺🇿", region: "Central Asia" },
];

// New place guides to add
const newPlaces = [
  { slug: "mount-rinjani", name: "Mount Rinjani", country: "Indonesia", flag: "🇮🇩", region: "Southeast Asia" },
  { slug: "zhangjiajie", name: "Zhangjiajie", country: "China", flag: "🇨🇳", region: "East Asia" },
  { slug: "trolltunga", name: "Trolltunga", country: "Norway", flag: "🇳🇴", region: "Europe" },
  { slug: "tulum-ruins", name: "Tulum Ruins", country: "Mexico", flag: "🇲🇽", region: "Central America" },
  { slug: "blue-hole-belize", name: "Blue Hole", country: "Belize", flag: "🇧🇿", region: "Central America" },
  { slug: "lake-malawi", name: "Lake Malawi", country: "Malawi", flag: "🇲🇼", region: "Africa" },
  { slug: "simien-mountains", name: "Simien Mountains", country: "Ethiopia", flag: "🇪🇹", region: "Africa" },
  { slug: "fairy-pools-skye", name: "Fairy Pools", country: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", region: "Europe" },
  { slug: "waitomo-caves", name: "Waitomo Caves", country: "New Zealand", flag: "🇳🇿", region: "Oceania" },
  { slug: "bay-of-islands", name: "Bay of Islands", country: "New Zealand", flag: "🇳🇿", region: "Oceania" },
  { slug: "tigers-nest", name: "Tiger's Nest", country: "Bhutan", flag: "🇧🇹", region: "South Asia" },
  { slug: "colca-canyon", name: "Colca Canyon", country: "Peru", flag: "🇵🇪", region: "South America" },
  { slug: "kelimutu", name: "Kelimutu", country: "Indonesia", flag: "🇮🇩", region: "Southeast Asia" },
  { slug: "tromso-northern-lights", name: "Tromso Northern Lights", country: "Norway", flag: "🇳🇴", region: "Europe" },
  { slug: "skeleton-coast", name: "Skeleton Coast", country: "Namibia", flag: "🇳🇦", region: "Africa" },
];

// Format a guide entry
const formatEntry = (g) => `  {
    slug: "${g.slug}",
    name: "${g.name}",
    country: "${g.country}",
    flag: "${g.flag}",
    region: "${g.region}",
  },`;

// Add cities before the closing ]; of cityGuides
const cityCloseIdx = content.indexOf('];\n\nconst placeGuides');
if (cityCloseIdx === -1) {
  console.error('Could not find cityGuides closing');
  process.exit(1);
}
const cityEntries = newCities.map(formatEntry).join('\n');
content = content.slice(0, cityCloseIdx) + cityEntries + '\n' + content.slice(cityCloseIdx);

// Add places before the closing ]; of placeGuides
const placeCloseMarker = '];\n\nconst cityGuideSortOptions';
const placeCloseIdx = content.indexOf(placeCloseMarker);
if (placeCloseIdx === -1) {
  console.error('Could not find placeGuides closing');
  process.exit(1);
}
const placeEntries = newPlaces.map(formatEntry).join('\n');
content = content.slice(0, placeCloseIdx) + placeEntries + '\n' + content.slice(placeCloseIdx);

// Add southern-africa route before the closing ]; of backpackerRoutes
const routeCloseMarker = '];\n\n// Guide slug';
const routeCloseIdx = content.indexOf(routeCloseMarker);
if (routeCloseIdx === -1) {
  console.error('Could not find backpackerRoutes closing');
  process.exit(1);
}
const routeEntry = `  {\n    slug: "southern-africa",\n    name: "Southern Africa",\n    flags: "🇿🇦🇳🇦🇧🇼🇿🇲",\n  },\n`;
content = content.slice(0, routeCloseIdx) + routeEntry + content.slice(routeCloseIdx);

// Add guideToRoutes mappings for middle-east-turkey and southern-africa
const routeMappingsMarker = '};';
const lastBraceIdx = content.lastIndexOf(routeMappingsMarker, content.lastIndexOf('export function getRoutes'));
// Find the closing }; of guideToRoutes
const guideToRoutesStart = content.indexOf('const guideToRoutes');
const guideToRoutesEnd = content.indexOf('};', guideToRoutesStart);

const middleEastMappings = `  amman: ["middle-east-turkey"],
  muscat: ["middle-east-turkey"],
  aqaba: ["middle-east-turkey"],
  fethiye: ["middle-east-turkey"],`;

const southernAfricaMappings = `  "cape-town": ["southern-africa"],
  durban: ["southern-africa"],
  windhoek: ["southern-africa"],
  swakopmund: ["southern-africa"],
  maun: ["southern-africa"],
  livingstone: ["southern-africa"],
  "garden-route": ["southern-africa"],
  drakensberg: ["southern-africa"],
  "etosha-national-park": ["southern-africa"],
  "fish-river-canyon": ["southern-africa"],
  "chobe-national-park": ["southern-africa"],
  "skeleton-coast": ["southern-africa"],`;

const allMappings = '\n' + middleEastMappings + '\n' + southernAfricaMappings + '\n';
content = content.slice(0, guideToRoutesEnd) + allMappings + content.slice(guideToRoutesEnd);

writeFileSync(guidesPath, content);
console.log(`Added ${newCities.length} city guides, ${newPlaces.length} place guides, 1 route, and route mappings`);
