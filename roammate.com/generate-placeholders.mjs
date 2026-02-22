#!/usr/bin/env node
/**
 * Generate placeholder webp images for missing blog and guide images.
 * Uses sharp to create small colored rectangles.
 */
import { existsSync, readdirSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const publicDir = join(import.meta.dirname, 'public');
const pagesDir = join(import.meta.dirname, 'src/pages');

// Collect all referenced images from blog and guide astro files
const missingImages = new Set();

function scanDir(dir) {
  const files = readdirSync(dir).filter(f => f.endsWith('.astro') && f !== 'index.astro');
  for (const file of files) {
    const content = readFileSync(join(dir, file), 'utf-8');
    const matches = content.matchAll(/\/images\/(blog|guides)\/[^"'\s)]+\.webp/g);
    for (const m of matches) {
      const imgPath = join(publicDir, m[0]);
      if (!existsSync(imgPath)) {
        missingImages.add(m[0]);
      }
    }
  }
}

scanDir(join(pagesDir, 'blog'));
scanDir(join(pagesDir, 'guides'));

console.log(`Found ${missingImages.size} missing images`);

// Color palette for variety
const colors = [
  { r: 196, g: 86, b: 42 },   // terracotta
  { r: 42, g: 120, b: 160 },  // ocean blue
  { r: 60, g: 130, b: 80 },   // forest green
  { r: 180, g: 140, b: 60 },  // golden
  { r: 120, g: 80, b: 140 },  // purple
  { r: 80, g: 120, b: 100 },  // sage
  { r: 160, g: 90, b: 90 },   // dusty rose
  { r: 90, g: 110, b: 140 },  // steel blue
];

let i = 0;
const errors = [];

for (const img of missingImages) {
  const fullPath = join(publicDir, img);
  const dir = fullPath.replace(/\/[^/]+$/, '');
  mkdirSync(dir, { recursive: true });

  const color = colors[i % colors.length];
  const isHero = img.includes('hero') || img.match(/\d\.webp$/);
  const width = isHero ? 1200 : 900;
  const height = isHero ? 800 : 600;

  try {
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: color,
      }
    })
    .webp({ quality: 60 })
    .toFile(fullPath);
    i++;
  } catch (e) {
    errors.push(`${img}: ${e.message}`);
  }
}

console.log(`Generated ${i} placeholder images`);
if (errors.length > 0) {
  console.log(`Errors: ${errors.length}`);
  errors.forEach(e => console.log(`  ${e}`));
}
