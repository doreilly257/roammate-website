import { readdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

export type ValidateOptions = {
  blogPosts: any[];
  guideSlugs: Set<string>;
  routeSlugs: Set<string>;
  blogPageDir?: string;
  publicDir?: string;
};

export function validate(opts: ValidateOptions): string[] {
  const { blogPosts, guideSlugs, routeSlugs } = opts;
  const blogPageDir = opts.blogPageDir ?? resolve(ROOT, "src/pages/blog");
  const publicDir = opts.publicDir ?? resolve(ROOT, "public");
  const errors: string[] = [];

  const blogSlugs = new Set(blogPosts.map((p) => p.slug));

  // 1. Every blog slug has a matching .astro file
  for (const slug of blogSlugs) {
    const astroPath = resolve(blogPageDir, `${slug}.astro`);
    if (!existsSync(astroPath)) {
      errors.push(`blog.ts slug "${slug}" has no matching file: src/pages/blog/${slug}.astro`);
    }
  }

  // 2. Every .astro file (except index) has a matching slug in blog.ts
  const astroFiles = readdirSync(blogPageDir).filter(
    (f) => f.endsWith(".astro") && f !== "index.astro"
  );
  for (const file of astroFiles) {
    const slug = file.replace(/\.astro$/, "");
    if (!blogSlugs.has(slug)) {
      errors.push(`src/pages/blog/${file} has no matching slug in blog.ts`);
    }
  }

  // 3. Every heroImage and section image exists in public/
  for (const post of blogPosts) {
    if (post.heroImage) {
      const imgPath = resolve(publicDir, post.heroImage.replace(/^\//, ""));
      if (!existsSync(imgPath)) {
        errors.push(`blog "${post.slug}" heroImage missing: ${post.heroImage}`);
      }
    }
    for (const section of post.sections ?? []) {
      if (section.image) {
        const imgPath = resolve(publicDir, section.image.replace(/^\//, ""));
        if (!existsSync(imgPath)) {
          errors.push(`blog "${post.slug}" section image missing: ${section.image}`);
        }
      }
    }
  }

  // 4. Every relatedPostSlugs entry resolves to a real slug
  for (const post of blogPosts) {
    for (const related of post.relatedPostSlugs ?? []) {
      if (!blogSlugs.has(related)) {
        errors.push(`blog "${post.slug}" relatedPostSlugs contains unknown slug: "${related}"`);
      }
    }
  }

  // 5. Every relatedGuideSlugs entry resolves to a real slug in guides.ts
  for (const post of blogPosts) {
    for (const related of post.relatedGuideSlugs ?? []) {
      if (!guideSlugs.has(related) && !routeSlugs.has(related)) {
        errors.push(`blog "${post.slug}" relatedGuideSlugs contains unknown slug: "${related}"`);
      }
    }
  }

  return errors;
}

async function main() {
  const { blogPosts } = await import("../src/data/blog.ts");
  const { allGuides, backpackerRoutes } = await import("../src/data/guides.ts");

  const guideSlugs = new Set(allGuides.map((g: any) => g.slug));
  const routeSlugs = new Set(backpackerRoutes.map((r: any) => r.slug));
  const errors = validate({ blogPosts, guideSlugs, routeSlugs });

  if (errors.length > 0) {
    console.error(`\nValidation failed with ${errors.length} error(s):\n`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    console.error("");
    process.exit(1);
  }

  console.log("Validation passed: all blog slugs, images, and references are consistent.");
  process.exit(0);
}

// Only run main when executed directly (not imported)
const isMain = process.argv[1]?.endsWith("validate.ts");
if (isMain) {
  main().catch((err) => {
    console.error("Validation script error:", err);
    process.exit(1);
  });
}
