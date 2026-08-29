import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { resolve, dirname, sep } from "path";
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

/**
 * Checks the BUILT output for internal links that 404.
 *
 * The checks above all read source data, which is why they never caught
 * companions/[slug].astro rebuilding its hero path as `/images/guides/
 * ${slug}-hero.webp`: every heroImage value in the collection was valid, but
 * the path the template actually emitted was not, and 34 pages shipped a dead
 * hero background, a dead preload and a broken og:image. A source-level check
 * cannot see a path that only exists after rendering. This one can.
 *
 * Every internal reference must resolve to a real file with no redirect hop --
 * a link to `/privacy` when the route is `/privacy/` costs a 308 on a path
 * real users follow.
 */
export function validateBuiltLinks(distDir: string): string[] {
  const errors: string[] = [];
  if (!existsSync(distDir)) return [`dist directory not found: ${distDir}`];

  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = resolve(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(distDir);

  // Every path the site can actually serve.
  const routes = new Set<string>();
  for (const f of files) {
    const rel = "/" + f.slice(distDir.length + 1).split(sep).join("/");
    routes.add(rel);
    if (rel.endsWith("/index.html")) routes.add(rel.slice(0, -"index.html".length));
  }

  const IGNORED = /^(https?:|\/\/|#|mailto:|tel:|javascript:|data:)/;
  const seen = new Map<string, string>();

  for (const f of files.filter((f) => f.endsWith(".html"))) {
    const page = "/" + f.slice(distDir.length + 1).split(sep).join("/");
    const html = readFileSync(f, "utf-8");

    const refs: string[] = [];
    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) refs.push(m[1]);
    // srcset carries width descriptors: "/a.webp 1x, /b.webp 2x"
    for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const part of m[1].split(",")) refs.push(part.trim().split(/\s+/)[0]);
    }
    // Inline background-image: url('/x.webp') -- how the broken companions hero
    // actually reached the page, and invisible to any attribute-only scan.
    for (const m of html.matchAll(/url\((?:'|"|&#39;)?(\/[^'")]+)/g)) refs.push(m[1]);

    for (const raw of refs) {
      if (!raw || IGNORED.test(raw)) continue;
      const target = raw.split("#")[0].split("?")[0];
      if (!target.startsWith("/")) continue;
      if (routes.has(target)) continue;
      if (!seen.has(target)) seen.set(target, page);
    }
  }

  for (const [target, page] of seen) {
    const hint = routes.has(target + "/") ? " (add the trailing slash)" : "";
    errors.push(`broken internal link: ${target}${hint} -- first seen on ${page}`);
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
  // --dist runs after `astro build`; the source checks run before it.
  if (process.argv.includes("--dist")) {
    const distDir = resolve(ROOT, "dist");
    const errors = validateBuiltLinks(distDir);
    if (errors.length > 0) {
      console.error(`\nBuilt-output validation failed with ${errors.length} broken link(s):\n`);
      for (const err of errors) console.error(`  - ${err}`);
      console.error("");
      process.exit(1);
    }
    console.log("Built output passed: no broken internal links.");
    process.exit(0);
  }

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
