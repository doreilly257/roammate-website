#!/usr/bin/env node
/**
 * Extract blog post data from .astro files and append missing entries to blog.ts
 */
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const blogDir = join(import.meta.dirname, 'src/pages/blog');
const blogTsPath = join(import.meta.dirname, 'src/data/blog.ts');

// Read existing blog.ts to find existing slugs
const blogTs = readFileSync(blogTsPath, 'utf-8');
const existingSlugs = new Set();
for (const match of blogTs.matchAll(/slug:\s*"([^"]+)"/g)) {
  existingSlugs.add(match[1]);
}
console.log(`Found ${existingSlugs.size} existing slugs in blog.ts`);

// Read all .astro files
const files = readdirSync(blogDir).filter(f => f.endsWith('.astro') && f !== 'index.astro');
console.log(`Found ${files.length} blog .astro files`);

const newEntries = [];

for (const file of files) {
  const content = readFileSync(join(blogDir, file), 'utf-8');

  // Extract the const post = { ... }; block
  const postMatch = content.match(/const post = \{[\s\S]*?\n\};/);
  if (!postMatch) continue;

  const postBlock = postMatch[0];

  // Extract slug
  const slugMatch = postBlock.match(/slug:\s*"([^"]+)"/);
  if (!slugMatch) continue;
  const slug = slugMatch[1];

  // Skip if already in blog.ts
  if (existingSlugs.has(slug)) continue;

  // Extract fields
  const extract = (field) => {
    const m = postBlock.match(new RegExp(`${field}:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 's'));
    return m ? m[1] : '';
  };

  const title = extract('title');
  const description = extract('description');
  const category = extract('category');
  const heroImage = extract('heroImage');
  const publishedAt = extract('publishedAt');
  const updatedAt = extract('updatedAt');
  const author = extract('author');
  const readingTime = extract('readingTime');

  // Extract intro (may be multiline)
  const introMatch = postBlock.match(/intro:\s*"((?:[^"\\]|\\.)*)"/s);
  const intro = introMatch ? introMatch[1] : '';

  // Extract sections array
  const sectionsMatch = postBlock.match(/sections:\s*\[([\s\S]*?)\],\s*\n\s*publishedAt/);
  let sectionsStr = '';
  if (sectionsMatch) {
    // Parse sections - extract heading, content, image for each
    const sectionBlocks = sectionsMatch[1].match(/\{[\s\S]*?\},?/g) || [];
    const sections = [];
    for (const sb of sectionBlocks) {
      const heading = sb.match(/heading:\s*"((?:[^"\\]|\\.)*)"/s);
      const sContent = sb.match(/content:\s*"((?:[^"\\]|\\.)*)"/s);
      const image = sb.match(/image:\s*"((?:[^"\\]|\\.)*)"/s);
      if (heading && sContent && image) {
        sections.push({
          heading: heading[1],
          content: sContent[1],
          image: image[1],
        });
      }
    }
    sectionsStr = sections.map(s => `      {\n        heading: "${s.heading}",\n        content: "${s.content}",\n        image: "${s.image}",\n      }`).join(',\n');
  }

  // Extract relatedPostSlugs
  const relatedMatch = postBlock.match(/relatedPostSlugs:\s*\[([\s\S]*?)\]/);
  let relatedSlugs = [];
  if (relatedMatch) {
    relatedSlugs = (relatedMatch[1].match(/"([^"]+)"/g) || []).map(s => s.replace(/"/g, ''));
  }
  const relatedStr = relatedSlugs.map(s => `"${s}"`).join(', ');

  const entry = `  {
    slug: "${slug}",
    title: "${title}",
    description: "${description}",
    category: "${category}",
    readMinutes: 2,
    heroImage: "${heroImage}",
    intro: "${intro}",
    sections: [
${sectionsStr}
    ],
    relatedPosts: [${relatedStr}],
    publishedAt: "${publishedAt}",
    updatedAt: "${updatedAt}",
    author: "${author}",
    readingTime: "${readingTime}",
    relatedPostSlugs: [${relatedStr}],
    relatedGuideSlugs: [],
  },`;

  newEntries.push(entry);
  console.log(`  + ${slug}`);
}

console.log(`\nFound ${newEntries.length} new entries to add`);

if (newEntries.length > 0) {
  // Insert before the closing ]; of blogPosts array
  const insertionPoint = blogTs.lastIndexOf('];');
  if (insertionPoint === -1) {
    console.error('Could not find insertion point in blog.ts');
    process.exit(1);
  }

  const newBlogTs = blogTs.slice(0, insertionPoint) + newEntries.join('\n') + '\n' + blogTs.slice(insertionPoint);
  writeFileSync(blogTsPath, newBlogTs);
  console.log(`Updated blog.ts with ${newEntries.length} new entries`);
}
