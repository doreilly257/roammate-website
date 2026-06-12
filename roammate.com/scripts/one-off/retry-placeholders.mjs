#!/usr/bin/env node
/**
 * Retry failed placeholder replacements with simpler search queries.
 */
import { writeFileSync, statSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const GUIDE_IMG_DIR = join(import.meta.dirname, 'public/images/guides');
const BLOG_IMG_DIR = join(import.meta.dirname, 'public/images/blog');
const DELAY_MS = 800;

// Simplified queries for failed images
const retryMap = {
  // Guide images - use simpler, broader queries
  'guides/blue-hole-belize-hero.webp': 'blue hole ocean aerial',
  'guides/durban-hero.webp': 'Durban beach skyline',
  'guides/garden-route-hero.webp': 'South Africa coastline forest',
  'guides/ha-giang-loop-hero.webp': 'Vietnam mountain road terraces',
  'guides/havana-hero.webp': 'Cuba colorful buildings vintage',
  'guides/lake-malawi-hero.webp': 'African lake beach clear water',
  'guides/maun-hero.webp': 'Okavango Delta aerial',
  'guides/penang-hero.webp': 'Georgetown Malaysia street art temple',
  'guides/phong-nha-caves-hero.webp': 'cave river boat Vietnam',
  'guides/waitomo-caves-hero.webp': 'glowworm cave New Zealand blue',
  'guides/windhoek-hero.webp': 'Namibia African city',
  // Blog images
  'blog/campervan-road-trip-guide-inline-1.webp': 'van camping sunset road trip',
  'blog/gap-year-planning-timeline-inline-1.webp': 'world map travel planning',
  'blog/lost-passport-emergency-plan-inline-1.webp': 'passport documents travel',
  'blog/meeting-people-solo-travel-hero.webp': 'solo traveler meeting friends',
  'blog/meeting-people-solo-travel-inline-1.webp': 'travelers talking hostel',
  'blog/off-season-travel-advantages-inline-2.webp': 'empty beach quiet peaceful',
  'blog/return-visitor-deeper-strategy-inline-2.webp': 'local neighborhood street market',
  'blog/teaching-english-abroad-guide-hero.webp': 'teaching classroom students',
  'blog/teaching-english-abroad-guide-inline-1.webp': 'school classroom whiteboard',
  'blog/temple-mosque-etiquette-guide-inline-2.webp': 'temple entrance shoes removed',
  'blog/travel-camera-phone-photography-inline-2.webp': 'travel landscape photography',
  'blog/travel-daypack-selection-hero.webp': 'small backpack daypack travel',
  'blog/travel-sketchbook-habit-inline-1.webp': 'drawing sketchbook pencil art',
  'blog/travel-tattoo-culture-guide-inline-2.webp': 'traditional tattoo art culture',
};

async function searchUnsplash(query, perPage = 3) {
  const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`Unsplash search failed: ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(r => ({
    id: r.id,
    url: r.urls?.raw || r.urls?.full,
  }));
}

async function downloadAndConvert(url, outputPath, width = 1200, height = 800) {
  const imgUrl = `${url}&w=${width}&h=${height}&fit=crop&q=80&fm=jpg`;
  const res = await fetch(imgUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1000) throw new Error(`Too small (${buffer.length} bytes)`);

  let quality = 80;
  let webpBuf = await sharp(buffer).resize(width, height, { fit: 'cover' }).webp({ quality }).toBuffer();
  while (webpBuf.length > 200 * 1024 && quality > 30) {
    quality -= 10;
    webpBuf = await sharp(buffer).resize(width, height, { fit: 'cover' }).webp({ quality }).toBuffer();
  }
  writeFileSync(outputPath, webpBuf);
  return webpBuf.length;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let success = 0, failed = 0;
  const failures = [];

  for (const [relPath, query] of Object.entries(retryMap)) {
    const dir = relPath.startsWith('guides/') ? GUIDE_IMG_DIR : BLOG_IMG_DIR;
    const filename = relPath.split('/')[1];
    const filePath = join(dir, filename);

    // Check if still placeholder
    try {
      const stat = statSync(filePath);
      if (stat.size >= 5000) {
        console.log(`  [OK] ${filename} already real`);
        continue;
      }
    } catch { continue; }

    try {
      console.log(`  Searching: "${query}"`);
      const results = await searchUnsplash(query, 2);
      if (results.length === 0) throw new Error('No results');
      const size = await downloadAndConvert(results[0].url, filePath);
      console.log(`  ✓ ${filename} (${(size / 1024).toFixed(0)}KB)`);
      success++;
    } catch (err) {
      console.log(`  ✗ ${filename}: ${err.message}`);
      failures.push({ file: filename, reason: err.message });
      failed++;
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nRetry done: ${success} success, ${failed} failed`);
  if (failures.length > 0) {
    console.log('Still failed:');
    failures.forEach(f => console.log(`  ${f.file}: ${f.reason}`));
  }
}

main().catch(console.error);
