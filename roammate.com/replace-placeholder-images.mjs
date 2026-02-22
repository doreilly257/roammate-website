#!/usr/bin/env node
/**
 * Replace all placeholder images (<5KB solid colors) with real Unsplash photos.
 * Uses Unsplash napi (no auth needed) to search and download photos.
 * Converts to webp via sharp, max 200KB, quality 80.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import sharp from 'sharp';

const GUIDE_IMG_DIR = join(import.meta.dirname, 'public/images/guides');
const BLOG_IMG_DIR = join(import.meta.dirname, 'public/images/blog');
const DELAY_MS = 600; // delay between API calls to avoid rate limiting

// Enhanced search queries for guide hero images
const guideSearchMap = {
  'addis-ababa-hero': 'Addis Ababa Ethiopia city aerial',
  'amman-hero': 'Amman Jordan citadel ancient',
  'aqaba-hero': 'Aqaba Jordan Red Sea coral',
  'bay-of-islands-hero': 'Bay of Islands New Zealand boats',
  'bishkek-hero': 'Bishkek Kyrgyzstan mountains city',
  'blue-hole-belize-hero': 'Great Blue Hole Belize aerial ocean',
  'bukhara-hero': 'Bukhara Uzbekistan mosque architecture',
  'cape-town-hero': 'Cape Town Table Mountain aerial',
  'chobe-national-park-hero': 'Chobe elephants river Botswana',
  'colca-canyon-hero': 'Colca Canyon Peru condor landscape',
  'da-nang-hero': 'Da Nang Vietnam dragon bridge',
  'drakensberg-hero': 'Drakensberg mountains South Africa green',
  'durban-hero': 'Durban South Africa beachfront skyline',
  'etosha-national-park-hero': 'Etosha salt pan wildlife Namibia',
  'fairy-pools-skye-hero': 'Fairy Pools Isle of Skye Scotland waterfall',
  'fethiye-hero': 'Fethiye Turkey coast paragliding blue lagoon',
  'fish-river-canyon-hero': 'Fish River Canyon Namibia landscape',
  'garden-route-hero': 'Garden Route South Africa coast Tsitsikamma',
  'ha-giang-loop-hero': 'Ha Giang Loop Vietnam rice terraces mountain road',
  'hampi-hero': 'Hampi India ancient ruins boulders temple',
  'havana-hero': 'Havana Cuba vintage cars colorful streets',
  'hue-hero': 'Hue Vietnam imperial citadel palace',
  'kawah-ijen-hero': 'Kawah Ijen blue fire volcano Indonesia',
  'kelimutu-hero': 'Kelimutu crater lakes Flores Indonesia',
  'kigali-hero': 'Kigali Rwanda city skyline green hills',
  'kota-kinabalu-hero': 'Kota Kinabalu Sabah Mount Kinabalu sunset',
  'lake-malawi-hero': 'Lake Malawi Africa clear water beach',
  'livingstone-hero': 'Victoria Falls Zambia waterfall mist',
  'maun-hero': 'Okavango Delta Botswana Maun aerial water',
  'mount-bromo-hero': 'Mount Bromo sunrise Java Indonesia volcano',
  'mount-rinjani-hero': 'Mount Rinjani crater lake Lombok Indonesia',
  'muscat-hero': 'Muscat Oman Sultan Qaboos mosque',
  'nha-trang-hero': 'Nha Trang Vietnam beach coast islands',
  'penang-hero': 'Penang Georgetown Malaysia street art',
  'phong-nha-caves-hero': 'Phong Nha cave Vietnam underground river',
  'rainbow-mountain-hero': 'Rainbow Mountain Vinicunca Peru colorful',
  'sapa-hero': 'Sapa Vietnam rice terraces mist mountains',
  'siena-hero': 'Siena Italy Piazza del Campo medieval',
  'simien-mountains-hero': 'Simien Mountains Ethiopia dramatic landscape',
  'skeleton-coast-hero': 'Skeleton Coast Namibia shipwreck desert ocean',
  'swakopmund-hero': 'Swakopmund Namibia coastal town dunes',
  'tigers-nest-hero': 'Tigers Nest Paro Taktsang Bhutan monastery cliff',
  'trolltunga-hero': 'Trolltunga Norway cliff fjord landscape',
  'tromso-northern-lights-hero': 'Tromso Norway northern lights aurora borealis',
  'tulum-ruins-hero': 'Tulum ruins Mexico Caribbean coast ancient',
  'udaipur-hero': 'Udaipur India Lake Palace Rajasthan',
  'waitomo-caves-hero': 'Waitomo Glowworm Caves New Zealand',
  'windhoek-hero': 'Windhoek Namibia city African skyline',
  'yogyakarta-hero': 'Borobudur temple Yogyakarta Indonesia sunrise',
  'zhangjiajie-hero': 'Zhangjiajie Avatar mountains China pillars',
  // Southern Africa route montage images
  'saf-cape': 'Cape Town South Africa scenic coastline',
  'saf-dunes': 'Sossusvlei sand dunes Namibia red desert',
  'saf-elephant': 'African elephant safari wildlife savanna',
  'saf-falls': 'Victoria Falls waterfall rainbow mist Zimbabwe',
};

// Blog search queries - derive from filename, with improved terms
const blogSearchOverrides = {
  'airport-lounge-budget-access': ['airport lounge luxury travel', 'priority pass airport lounge comfortable', 'airport terminal modern seats waiting'],
  'best-backpack-sizes-compared': ['travel backpacks hiking different sizes', 'backpacker gear packing backpack', 'travelers with backpacks hostel colorful'],
  'budget-flight-search-tactics': ['cheap flights airport departures board', 'airplane window clouds sky travel', 'person using laptop booking flights'],
  'campervan-road-trip-guide': ['campervan road trip scenic mountains', 'VW van camping sunset beach', 'campervan interior cozy road trip'],
  'cold-weather-backpacking-layers': ['winter hiking snow mountains gear', 'cold weather travel warm clothing layered', 'snowy mountain trekking backpacker winter'],
  'cooking-from-local-markets': ['local food market colorful fresh produce', 'cooking street food night market Asia', 'fresh fruit market tropical travel'],
  'dealing-with-homesickness': ['person looking out window sunset lonely', 'writing letter home nostalgic travel', 'video call laptop travel connection home'],
  'desert-travel-preparation': ['desert landscape sand dunes Sahara travel', 'desert camping tent sunset orange', 'camel caravan desert Sahara Morocco'],
  'digital-detox-while-traveling': ['person reading book hammock tropical', 'sunset beach no phone mindful', 'nature forest hiking peaceful disconnect'],
  'dry-bag-waterproof-essentials': ['dry bag kayaking river adventure', 'waterproof gear beach travel accessories', 'rafting adventure river outdoor wet'],
  'eco-lodge-vs-hostel-comparison': ['eco lodge tropical jungle treehouse', 'hostel bunk bed dormitory backpacker', 'sustainable bamboo lodge nature'],
  'ethical-wildlife-encounters': ['wildlife safari ethical tourism elephants', 'sea turtle ocean conservation marine', 'orangutan Borneo ethical wildlife sanctuary'],
  'festival-travel-planning': ['music festival crowd colorful outdoor', 'Holi festival India colors celebration', 'lantern festival Asia night sky'],
  'first-backpacking-trip-checklist': ['backpacker packing gear travel essentials', 'first trip excited airport young traveler', 'backpack contents gear organized layout'],
  'gap-year-planning-timeline': ['young travelers world map planning trip', 'gap year backpackers adventure beach', 'calendar planning travel itinerary notebook'],
  'group-travel-coordination': ['group friends traveling together laughing', 'group travel bus adventure together', 'friends hiking mountain group trip'],
  'haggling-negotiation-tips-abroad': ['market bazaar negotiating colorful goods', 'souk Morocco shopping haggling travel', 'night market Southeast Asia street vendors'],
  'hostel-cooking-budget-meals': ['hostel kitchen cooking travelers budget', 'simple meal backpacker budget food plate', 'shared kitchen hostel community cooking'],
  'hostel-social-scene-navigation': ['hostel common room travelers socializing', 'rooftop bar hostel friends sunset', 'hostel lounge games social travelers'],
  'house-sitting-travel-strategy': ['cozy home living room pet cat house', 'house sitting garden peaceful home', 'feeding dog pet sitting travel home'],
  'island-hopping-route-planning': ['island hopping boat tropical turquoise', 'Greek islands aerial view blue sea', 'longtail boat Thailand island paradise'],
  'lost-passport-emergency-plan': ['passport travel documents emergency abroad', 'embassy building consulate official help', 'stressed traveler looking through bag papers'],
  'meeting-people-solo-travel': ['solo traveler meeting locals friendly', 'hostel group dinner friends international', 'coffee shop traveler chatting locals new friends'],
  'mindfulness-meditation-travel': ['meditation yoga sunrise mountain travel', 'mindful traveler temple peaceful calm', 'person meditating beach sunset peaceful'],
  'motorcycle-scooter-rental-abroad': ['scooter rental Bali rice terraces ride', 'motorcycle winding road Vietnam mountain', 'couple scooter riding tropical island'],
  'multi-city-flight-routing': ['world map flight routes airline', 'airport departures screen flights', 'airplane routes multiple destinations globe'],
  'noise-canceling-headphones-travel': ['person headphones bus travel music', 'headphones airport noise canceling travel', 'listening music train travel window view'],
  'off-season-travel-advantages': ['empty beach off season quiet travel', 'quiet temple no crowds peaceful', 'autumn Europe empty streets colorful leaves'],
  'overland-vs-flying-comparison': ['train journey landscape window scenic', 'overland bus route Africa dusty', 'airplane vs train travel comparison road'],
  'portable-hammock-travel': ['hammock beach tropical palm trees relax', 'hammock forest camping outdoor nature', 'person hammock reading riverside peaceful'],
  'portable-power-charging-kit': ['power bank charging phone travel gear', 'electronic travel accessories cables charger', 'digital nomad laptop cafe charging'],
  'quick-dry-towel-accessories': ['quick dry towel beach travel compact', 'swimming lake outdoor towel adventure', 'backpacker beach towel lightweight travel'],
  'return-visitor-deeper-strategy': ['local neighborhood authentic hidden gem', 'alleyway local life city culture', 'revisiting favorite travel spot familiar street'],
  'river-travel-routes-worldwide': ['Mekong river boat Southeast Asia sunset', 'Amazon river boat jungle adventure', 'Danube river cruise Europe scenic'],
  'sleep-kit-overnight-travel': ['sleeping on bus overnight travel pillow', 'eye mask earplugs travel sleep kit', 'sleeping train compartment night travel'],
  'solo-travel-vs-group-tours': ['solo traveler viewpoint mountain alone', 'group tour bus organized travelers', 'solo female traveler confident happy backpack'],
  'staying-healthy-long-term-travel': ['yoga healthy traveler beach morning', 'healthy food bowl fresh travel nutrition', 'running exercise travel morning fitness'],
  'sustainable-backpacking-practices': ['reusable water bottle sustainable travel', 'eco travel bamboo straw zero waste', 'sustainable backpacker nature conservation'],
  'teaching-english-abroad-guide': ['classroom teaching English abroad whiteboard', 'teacher students Asia classroom international', 'English lesson abroad children learning happy'],
  'temple-mosque-etiquette-guide': ['Buddhist temple golden prayer respectful', 'mosque architecture Islamic interior beautiful', 'removing shoes temple entrance cultural respect'],
  'train-pass-europe-asia': ['European train scenic Alps window', 'Japan bullet train Shinkansen platform', 'train station Europe backpacker platform ticket'],
  'travel-anxiety-coping-strategies': ['calm deep breathing travel anxiety relief', 'journal writing airplane window calming', 'peaceful sunset traveler overcoming anxiety'],
  'travel-camera-phone-photography': ['travel photography camera sunset landscape', 'phone photography street scene colorful travel', 'photographer travel action landscape framing'],
  'travel-daypack-selection': ['daypack city exploring sightseeing urban', 'small backpack day hike nature trail', 'day pack traveler street market shopping'],
  'travel-first-aid-kit-guide': ['first aid kit travel medical supplies', 'medicine pharmacy travel health abroad', 'bandages antiseptic travel medical compact kit'],
  'travel-friendship-building': ['travelers friends sunset beach bonfire', 'international friends hiking together diverse', 'friends laughing dinner hostel travel memories'],
  'travel-journaling-methods': ['travel journal writing notebook cafe pen', 'handwritten travel diary sketches memories', 'journaling sunset travel reflection notebook'],
  'travel-shoe-system': ['hiking boots trail outdoor footwear', 'travel shoes sandals packing versatile', 'walking shoes cobblestone street Europe travel'],
  'travel-sketchbook-habit': ['artist sketching travel watercolor journal', 'sketchbook pencil drawing scenic landscape', 'sketching cafe outdoor travel art creative'],
  'travel-tattoo-culture-guide': ['traditional tattoo Sak Yant Thailand', 'tattoo artist studio travel culture ink', 'Japanese traditional tattoo art irezumi'],
  'traveling-with-food-allergies': ['food allergy card restaurant international', 'reading menu carefully dietary restrictions', 'fresh simple food plate dietary travel safe'],
  'tropical-disease-prevention': ['mosquito net tropical bed prevention', 'tropical jungle healthcare travel medicine', 'insect repellent spray tropical travel health'],
  'volunteer-travel-ethics': ['volunteer community project Africa ethical', 'building school volunteer travel meaningful', 'community garden volunteer travel giving back'],
  'water-filter-bottle-backpackers': ['water filter bottle outdoor hiking stream', 'purifying water travel portable filter', 'clean water bottle trekking mountain nature'],
  'working-holiday-visa-playbook': ['working holiday farm Australia backpacker', 'barista cafe working abroad travel job', 'fruit picking seasonal work travel abroad'],
};

async function searchUnsplash(query, perPage = 3) {
  const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) throw new Error(`Unsplash search failed: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(r => ({
    id: r.id,
    url: r.urls?.raw || r.urls?.full,
    alt: r.alt_description || r.description || query,
  }));
}

async function downloadAndConvert(url, outputPath, width = 1200, height = 800) {
  const imgUrl = `${url}&w=${width}&h=${height}&fit=crop&q=80&fm=jpg`;
  const res = await fetch(imgUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  // Verify it's a real image (not a redirect/HTML)
  if (buffer.length < 1000) {
    throw new Error(`Too small (${buffer.length} bytes), likely not a real image`);
  }

  // Convert to webp, max 200KB
  let quality = 80;
  let webpBuf = await sharp(buffer).resize(width, height, { fit: 'cover' }).webp({ quality }).toBuffer();

  while (webpBuf.length > 200 * 1024 && quality > 30) {
    quality -= 10;
    webpBuf = await sharp(buffer).resize(width, height, { fit: 'cover' }).webp({ quality }).toBuffer();
  }

  writeFileSync(outputPath, webpBuf);
  return webpBuf.length;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Find all placeholder images (< 5KB)
function getPlaceholders(dir) {
  return readdirSync(dir)
    .filter(f => f.endsWith('.webp'))
    .filter(f => {
      const stat = statSync(join(dir, f));
      return stat.size < 5000;
    });
}

async function main() {
  const guideplaceholders = getPlaceholders(GUIDE_IMG_DIR);
  const blogPlaceholders = getPlaceholders(BLOG_IMG_DIR);

  console.log(`Found ${guideplaceholders.length} guide placeholders, ${blogPlaceholders.length} blog placeholders`);

  let success = 0;
  let failed = 0;
  const failures = [];

  // --- Process guide images ---
  console.log('\n=== GUIDE IMAGES ===');
  for (const filename of guideplaceholders) {
    const key = filename.replace('.webp', '');
    const query = guideSearchMap[key];
    if (!query) {
      console.log(`  [SKIP] No query for ${filename}`);
      failures.push({ file: filename, reason: 'no query mapping' });
      failed++;
      continue;
    }

    try {
      console.log(`  Searching: "${query}"`);
      const results = await searchUnsplash(query, 1);
      if (results.length === 0) {
        throw new Error('No results');
      }

      const photo = results[0];
      const outputPath = join(GUIDE_IMG_DIR, filename);
      const size = await downloadAndConvert(photo.url, outputPath);
      console.log(`  ✓ ${filename} (${(size / 1024).toFixed(0)}KB)`);
      success++;
    } catch (err) {
      console.log(`  ✗ ${filename}: ${err.message}`);
      failures.push({ file: filename, reason: err.message });
      failed++;
    }

    await sleep(DELAY_MS);
  }

  // --- Process blog images ---
  console.log('\n=== BLOG IMAGES ===');

  // Group by post slug (remove -hero, -inline-1, -inline-2 suffix)
  const blogPostSlugs = [...new Set(blogPlaceholders.map(f =>
    f.replace('.webp', '').replace(/-hero$/, '').replace(/-inline-\d+$/, '')
  ))];

  for (const slug of blogPostSlugs) {
    const queries = blogSearchOverrides[slug];
    if (!queries || queries.length < 3) {
      console.log(`  [SKIP] No queries for blog: ${slug}`);
      failed += 3;
      continue;
    }

    const images = [
      { file: `${slug}-hero.webp`, query: queries[0] },
      { file: `${slug}-inline-1.webp`, query: queries[1] },
      { file: `${slug}-inline-2.webp`, query: queries[2] },
    ];

    for (const img of images) {
      // Only process if it's actually a placeholder
      const filePath = join(BLOG_IMG_DIR, img.file);
      try {
        const stat = statSync(filePath);
        if (stat.size >= 5000) {
          console.log(`  [OK] ${img.file} already has real image`);
          continue;
        }
      } catch {
        console.log(`  [SKIP] ${img.file} not found`);
        continue;
      }

      try {
        console.log(`  Searching: "${img.query}"`);
        const results = await searchUnsplash(img.query, 1);
        if (results.length === 0) throw new Error('No results');

        const photo = results[0];
        const size = await downloadAndConvert(photo.url, filePath);
        console.log(`  ✓ ${img.file} (${(size / 1024).toFixed(0)}KB)`);
        success++;
      } catch (err) {
        console.log(`  ✗ ${img.file}: ${err.message}`);
        failures.push({ file: img.file, reason: err.message });
        failed++;
      }

      await sleep(DELAY_MS);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Success: ${success}, Failed: ${failed}`);
  if (failures.length > 0) {
    console.log(`\nFailed images:`);
    for (const f of failures) {
      console.log(`  ${f.file}: ${f.reason}`);
    }
  }
}

main().catch(console.error);
