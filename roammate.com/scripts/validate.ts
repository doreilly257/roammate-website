import { readdirSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

export type ValidateOptions = {
  blogPosts: any[];
  guideSlugs: Set<string>;
  routeSlugs: Set<string>;
  guides?: any[];
  contentBlogDir?: string;
  publicDir?: string;
};

export function validate(opts: ValidateOptions): string[] {
  const { blogPosts, guideSlugs, routeSlugs } = opts;
  const guides = opts.guides ?? [];
  const contentBlogDir = opts.contentBlogDir ?? resolve(ROOT, "src/content/blog");
  const publicDir = opts.publicDir ?? resolve(ROOT, "public");
  const errors: string[] = [];

  const blogSlugs = new Set(blogPosts.map((p) => p.slug));

  // 1. Every blog slug has a matching .json content file
  for (const slug of blogSlugs) {
    const jsonPath = resolve(contentBlogDir, `${slug}.json`);
    if (!existsSync(jsonPath)) {
      errors.push(`blog slug "${slug}" has no matching file: src/content/blog/${slug}.json`);
    }
  }

  // 2. Every .json file in content/blog has a matching slug
  if (existsSync(contentBlogDir)) {
    const jsonFiles = readdirSync(contentBlogDir).filter(
      (f) => f.endsWith(".json")
    );
    for (const file of jsonFiles) {
      const slug = file.replace(/\.json$/, "");
      if (!blogSlugs.has(slug)) {
        errors.push(`src/content/blog/${file} has no matching slug in blog data`);
      }
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

  // 6. Every guide heroImage / heroImages entry resolves to a file in public/
  const imageExists = (img: string) =>
    existsSync(resolve(publicDir, img.replace(/^\//, "")));

  for (const guide of guides) {
    const file = guide._file ?? `${guide.slug}.json`;

    if (typeof guide.heroImage === "string" && !imageExists(guide.heroImage)) {
      errors.push(`guide ${file} heroImage missing: ${guide.heroImage}`);
    }

    if (Array.isArray(guide.heroImages)) {
      guide.heroImages.forEach((entry: any, i: number) => {
        const src = typeof entry === "string" ? entry : entry?.src;
        if (typeof src === "string" && !imageExists(src)) {
          errors.push(`guide ${file} heroImages[${i}] missing: ${src}`);
        }
      });
    }
  }

  // 7. Every featuredGuides slug in a backpacker route resolves to a guide slug
  for (const guide of guides) {
    if (guide.type !== "backpacker") continue;
    const file = guide._file ?? `${guide.slug}.json`;
    for (const slug of guide.featuredGuides ?? []) {
      if (!guideSlugs.has(slug)) {
        errors.push(`route ${file} featuredGuides contains unknown guide slug: "${slug}"`);
      }
    }
  }

  return errors;
}

function loadBlogPostsFromJson(): any[] {
  const contentDir = resolve(ROOT, "src/content/blog");
  const files = readdirSync(contentDir).filter((f) => f.endsWith(".json"));
  return files.map((file) => {
    const slug = file.replace(/\.json$/, "");
    const data = JSON.parse(
      readFileSync(resolve(contentDir, file), "utf-8")
    );
    return { slug, ...data };
  });
}

function loadGuidesFromJson(): { guides: any[]; guideSlugs: Set<string>; routeSlugs: Set<string> } {
  // guides.ts reads the same collection via astro:content, which only exists
  // inside the Astro build — so read the content JSON directly here.
  const contentDir = resolve(ROOT, "src/content/guides");
  const guides: any[] = [];
  const guideSlugs = new Set<string>();
  const routeSlugs = new Set<string>();
  for (const file of readdirSync(contentDir).filter((f) => f.endsWith(".json"))) {
    const data = JSON.parse(readFileSync(resolve(contentDir, file), "utf-8"));
    guides.push({ _file: file, ...data });
    if (data.type === "backpacker") routeSlugs.add(data.slug);
    else guideSlugs.add(data.slug);
  }
  return { guides, guideSlugs, routeSlugs };
}

async function main() {
  const blogPosts = loadBlogPostsFromJson();
  const { guides, guideSlugs, routeSlugs } = loadGuidesFromJson();
  const errors = validate({ blogPosts, guideSlugs, routeSlugs, guides });

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
