#!/usr/bin/env node
/**
 * Replace Unsplash+ watermarked blog images with free Unsplash photos.
 * Uses official Unsplash API, filters out premium results.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const BLOG_IMG_DIR = join(import.meta.dirname, 'public/images/blog');
const BLOG_DATA_DIR = join(import.meta.dirname, 'src/content/blog');
const UNSPLASH_KEY = '2sIDoMA2phggLhcQ_b7lv1emzlpsLgg0Hudl32okhYY';
const DELAY_MS = 1200; // stay under 50 req/hr limit

async function searchUnsplash(query, perPage = 10) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Client-ID ${UNSPLASH_KEY}` }
  });
  if (!res.ok) {
    if (res.status === 429) {
      const retryAfter = res.headers.get('x-ratelimit-reset');
      const waitSec = retryAfter ? Math.max(1, Number(retryAfter) - Math.floor(Date.now()/1000)) : 60;
      console.log(`    Rate limited, waiting ${waitSec}s...`);
      await sleep(waitSec * 1000);
      return searchUnsplash(query, perPage);
    }
    throw new Error(`Unsplash API: ${res.status}`);
  }
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining) console.log(`    [API calls remaining: ${remaining}]`);

  const data = await res.json();
  return (data.results || [])
    .filter(r => !r.premium && !r.plus)
    .map(r => ({
      id: r.id,
      url: r.urls?.raw,
      alt: r.alt_description || r.description || query,
    }));
}

async function downloadAndConvert(url, outputPath, width = 1600, height = 900) {
  const imgUrl = `${url}${url.includes('?') ? '&' : '?'}w=${width * 2}&q=80&fm=jpg`;
  const res = await fetch(imgUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  if (buffer.length < 2000) {
    throw new Error(`Too small (${buffer.length} bytes)`);
  }
  const head = buffer.slice(0, 20).toString('utf8');
  if (head.includes('<!') || head.includes('<html')) {
    throw new Error('Got HTML instead of image');
  }

  let quality = 80;
  let webpBuf = await sharp(buffer).resize(width, height, { fit: 'cover' }).webp({ quality }).toBuffer();
  const maxSize = width > 1000 ? 300 * 1024 : 200 * 1024;
  while (webpBuf.length > maxSize && quality > 30) {
    quality -= 10;
    webpBuf = await sharp(buffer).resize(width, height, { fit: 'cover' }).webp({ quality }).toBuffer();
  }

  writeFileSync(outputPath, webpBuf);
  return webpBuf.length;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSlug(filename) {
  return filename.replace('.webp', '').replace(/-hero$/, '').replace(/-inline-\d+$/, '');
}

function getImageType(filename) {
  if (filename.includes('-hero')) return 'hero';
  if (filename.includes('-inline-1')) return 'inline1';
  if (filename.includes('-inline-2')) return 'inline2';
  return 'other';
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const slugFilter = args.find(a => !a.startsWith('--'));

  const allImages = readdirSync(BLOG_IMG_DIR).filter(f => f.endsWith('.webp')).sort();
  const slugs = [...new Set(allImages.map(getSlug))];
  const targetSlugs = slugFilter ? slugs.filter(s => s.includes(slugFilter)) : slugs;

  console.log(`Total slugs: ${slugs.length}, processing: ${targetSlugs.length}`);
  let success = 0, failed = 0;

  for (const slug of targetSlugs) {
    const slugImages = allImages.filter(f => getSlug(f) === slug);

    // Read blog data to build better queries
    let title = slug.replace(/-/g, ' ');
    let sections = [];
    const blogDataFile = join(BLOG_DATA_DIR, `${slug}.json`);
    if (existsSync(blogDataFile)) {
      try {
        const data = JSON.parse(readFileSync(blogDataFile, 'utf8'));
        title = data.title || title;
        sections = (data.sections || []).map(s => s.heading);
      } catch {}
    }

    console.log(`\n[${slug}] "${title}"`);

    // Search once per slug with the title, get enough results for all images
    const query = `${title} travel`;
    try {
      console.log(`  Searching: "${query}"`);
      const results = await searchUnsplash(query, 15);

      if (results.length === 0) {
        // Fallback: simpler query
        const fallbackQ = slug.replace(/-/g, ' ') + ' travel photography';
        console.log(`  No free results, fallback: "${fallbackQ}"`);
        const fallback = await searchUnsplash(fallbackQ, 15);
        if (fallback.length === 0) {
          console.log(`  ✗ No free photos found for ${slug}`);
          failed += slugImages.length;
          await sleep(DELAY_MS);
          continue;
        }
        results.push(...fallback);
      }

      // Assign different photos to hero, inline-1, inline-2
      let photoIdx = 0;
      for (const imgFile of slugImages) {
        const filePath = join(BLOG_IMG_DIR, imgFile);
        const pick = results[photoIdx % results.length];
        photoIdx++;

        if (dryRun) {
          console.log(`  [DRY] ${imgFile} -> photo ${pick.id}`);
          continue;
        }

        try {
          const isHero = imgFile.includes('-hero');
          const w = isHero ? 1600 : 900;
          const h = isHero ? 900 : 600;
          const size = await downloadAndConvert(pick.url, filePath, w, h);
          console.log(`  ✓ ${imgFile} (${(size / 1024).toFixed(0)}KB${isHero ? ' @1600' : ''}) photo:${pick.id}`);
          success++;
        } catch (err) {
          console.log(`  ✗ ${imgFile}: ${err.message}`);
          failed++;
        }
      }
    } catch (err) {
      console.log(`  ✗ Search failed: ${err.message}`);
      failed += slugImages.length;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n=== DONE === Success: ${success}, Failed: ${failed}`);
}

main().catch(console.error);
