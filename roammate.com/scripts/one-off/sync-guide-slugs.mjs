#!/usr/bin/env node
/**
 * Sync relatedGuideSlugs from .astro files back into blog.ts
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const blogDir = join(import.meta.dirname, 'src/pages/blog');
const blogTsPath = join(import.meta.dirname, 'src/data/blog.ts');

let blogTs = readFileSync(blogTsPath, 'utf-8');
let updated = 0;

const files = readdirSync(blogDir).filter(f => f.endsWith('.astro') && f !== 'index.astro');

for (const file of files) {
  const content = readFileSync(join(blogDir, file), 'utf-8');

  // Extract slug
  const slugMatch = content.match(/slug:\s*"([^"]+)"/);
  if (!slugMatch) continue;
  const slug = slugMatch[1];

  // Extract relatedGuideSlugs from .astro
  const guideMatch = content.match(/relatedGuideSlugs:\s*\[([^\]]*)\]/);
  if (!guideMatch || !guideMatch[1].trim()) continue;

  const guideSlugs = (guideMatch[1].match(/"([^"]+)"/g) || []).map(s => s.replace(/"/g, ''));
  if (guideSlugs.length === 0) continue;

  const guideSlugsStr = guideSlugs.map(s => `"${s}"`).join(', ');

  // Find this entry in blog.ts and update relatedGuideSlugs
  // Look for the entry with this slug and replace its relatedGuideSlugs: []
  const entryPattern = new RegExp(
    `(slug: "${slug}"[\\s\\S]*?)relatedGuideSlugs:\\s*\\[\\]`,
    'm'
  );

  const newBlogTs = blogTs.replace(entryPattern, `$1relatedGuideSlugs: [${guideSlugsStr}]`);
  if (newBlogTs !== blogTs) {
    blogTs = newBlogTs;
    updated++;
  }
}

writeFileSync(blogTsPath, blogTs);
console.log(`Updated relatedGuideSlugs for ${updated} entries in blog.ts`);
