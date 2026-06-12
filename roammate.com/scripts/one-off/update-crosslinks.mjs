#!/usr/bin/env node
/**
 * Update relatedGuideSlugs in blog .astro files based on content matching.
 * Maps blog topics to relevant guide slugs.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const blogDir = join(import.meta.dirname, 'src/pages/blog');

// Topic → guide slug mappings
const topicGuideMap = {
  // Southeast Asia
  'southeast asia': ['southeast-asia', 'bangkok', 'ho-chi-minh-city'],
  'thailand': ['bangkok', 'phuket', 'southeast-asia'],
  'vietnam': ['hanoi', 'ho-chi-minh-city', 'hue', 'da-nang', 'nha-trang', 'sapa'],
  'bali': ['denpasar', 'indonesia-philippines'],
  'indonesia': ['denpasar', 'yogyakarta', 'mount-bromo', 'kawah-ijen', 'mount-rinjani', 'kelimutu'],
  'philippines': ['manila', 'indonesia-philippines'],
  'malaysia': ['kuala-lumpur', 'penang', 'kota-kinabalu'],
  'cambodia': ['siem-reap', 'angkor-wat'],
  'laos': ['luang-prabang'],
  // South Asia
  'india': ['india', 'delhi', 'jaipur', 'udaipur', 'hampi', 'goa'],
  'bhutan': ['tigers-nest'],
  // East Asia
  'japan': ['tokyo', 'kyoto', 'osaka', 'japan-south-korea'],
  'south korea': ['seoul', 'japan-south-korea'],
  'china': ['zhangjiajie'],
  // Europe
  'europe': ['europe', 'paris', 'barcelona', 'rome', 'amsterdam'],
  'italy': ['rome', 'florence', 'siena', 'europe'],
  'norway': ['trolltunga', 'tromso-northern-lights'],
  'scotland': ['fairy-pools-skye'],
  'switzerland': ['zurich'],
  // Americas
  'south america': ['south-america', 'lima', 'bogota', 'cusco'],
  'central america': ['central-america', 'tulum-ruins', 'blue-hole-belize'],
  'peru': ['cusco', 'colca-canyon', 'rainbow-mountain'],
  'mexico': ['mexico-city', 'tulum-ruins'],
  'cuba': ['havana'],
  // Africa
  'africa': ['east-africa', 'nairobi', 'cape-town'],
  'south africa': ['cape-town', 'durban', 'garden-route', 'drakensberg', 'southern-africa'],
  'east africa': ['east-africa', 'nairobi', 'kigali'],
  'namibia': ['windhoek', 'swakopmund', 'etosha-national-park', 'skeleton-coast', 'fish-river-canyon'],
  'botswana': ['maun', 'chobe-national-park'],
  'ethiopia': ['addis-ababa', 'simien-mountains'],
  'zambia': ['livingstone'],
  // Middle East
  'middle east': ['middle-east-turkey', 'dubai', 'amman'],
  'jordan': ['amman', 'aqaba', 'middle-east-turkey'],
  'turkey': ['istanbul', 'fethiye', 'middle-east-turkey'],
  'oman': ['muscat', 'middle-east-turkey'],
  // Oceania
  'new zealand': ['australia-new-zealand', 'waitomo-caves', 'bay-of-islands'],
  'australia': ['sydney', 'melbourne', 'australia-new-zealand'],
  // Topics
  'backpack': ['southeast-asia', 'europe'],
  'hostel': ['bangkok', 'lisbon', 'budapest'],
  'train': ['tokyo', 'europe', 'japan-south-korea'],
  'island': ['denpasar', 'phuket', 'indonesia-philippines'],
  'desert': ['middle-east-turkey', 'morocco-west-africa'],
  'tropical': ['southeast-asia', 'denpasar', 'phuket'],
  'mountain': ['mount-bromo', 'mount-rinjani', 'rainbow-mountain', 'trolltunga'],
  'wildlife': ['east-africa', 'etosha-national-park', 'chobe-national-park'],
  'festival': ['bangkok', 'rio-de-janeiro', 'tokyo'],
  'scooter': ['denpasar', 'ho-chi-minh-city', 'southeast-asia'],
  'motorcycle': ['denpasar', 'ho-chi-minh-city'],
  'cooking': ['bangkok', 'florence', 'tokyo'],
  'road trip': ['garden-route', 'australia-new-zealand'],
  'campervan': ['australia-new-zealand', 'bay-of-islands'],
  'cold weather': ['tromso-northern-lights', 'trolltunga'],
  'gap year': ['southeast-asia', 'south-america', 'europe'],
  'working holiday': ['australia-new-zealand', 'tokyo'],
  'teaching english': ['bangkok', 'ho-chi-minh-city', 'seoul'],
  'volunteer': ['east-africa', 'kigali', 'central-america'],
  'meditation': ['india', 'denpasar', 'luang-prabang'],
  'temple': ['angkor-wat', 'kyoto', 'luang-prabang'],
  'mosque': ['istanbul', 'amman', 'muscat'],
};

const files = readdirSync(blogDir).filter(f => f.endsWith('.astro') && f !== 'index.astro');
let updated = 0;

for (const file of files) {
  const filePath = join(blogDir, file);
  let content = readFileSync(filePath, 'utf-8');

  // Skip if already has non-empty relatedGuideSlugs
  if (content.match(/relatedGuideSlugs:\s*\[[^\]]+\]/)) continue;

  const contentLower = content.toLowerCase();
  const matchedGuides = new Set();

  for (const [topic, guides] of Object.entries(topicGuideMap)) {
    if (contentLower.includes(topic)) {
      for (const g of guides) {
        matchedGuides.add(g);
      }
    }
  }

  if (matchedGuides.size === 0) continue;

  // Take top 3 most relevant
  const guideSlugs = [...matchedGuides].slice(0, 3);
  const guideSlugsStr = guideSlugs.map(s => `"${s}"`).join(', ');

  // Replace empty relatedGuideSlugs
  const newContent = content.replace(
    /relatedGuideSlugs:\s*\[\]\s*as\s*string\[\]/,
    `relatedGuideSlugs: [${guideSlugsStr}] as string[]`
  );

  if (newContent !== content) {
    writeFileSync(filePath, newContent);
    updated++;
  }
}

console.log(`Updated ${updated} blog posts with guide cross-links`);
