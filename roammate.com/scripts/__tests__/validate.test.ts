import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { validate } from "../validate.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function loadBlogPostsFromJson(): any[] {
  const contentDir = resolve(ROOT, "src/content/blog");
  const files = readdirSync(contentDir).filter((f) => f.endsWith(".json"));
  return files.map((file) => {
    const slug = file.replace(/\.json$/, "");
    const data = JSON.parse(readFileSync(resolve(contentDir, file), "utf-8"));
    return { slug, ...data };
  });
}

function loadGuideSlugsFromJson(): Set<string> {
  const contentDir = resolve(ROOT, "src/content/guides");
  const files = readdirSync(contentDir).filter((f) => f.endsWith(".json"));
  const slugs: string[] = [];
  for (const file of files) {
    const data = JSON.parse(readFileSync(resolve(contentDir, file), "utf-8"));
    if (data.type === "city") slugs.push(data.slug);
  }
  return new Set(slugs);
}

function loadRouteSlugsFromJson(): Set<string> {
  const contentDir = resolve(ROOT, "src/content/guides");
  const files = readdirSync(contentDir).filter((f) => f.endsWith(".json"));
  const slugs: string[] = [];
  for (const file of files) {
    const data = JSON.parse(readFileSync(resolve(contentDir, file), "utf-8"));
    if (data.type === "backpacker") slugs.push(data.slug);
  }
  return new Set(slugs);
}

const blogPosts = loadBlogPostsFromJson();
const guideSlugs = loadGuideSlugsFromJson();
const routeSlugs = loadRouteSlugsFromJson();

describe("validate", () => {
  it("passes on current (known-good) state", () => {
    const errors = validate({ blogPosts, guideSlugs, routeSlugs });
    expect(errors).toEqual([]);
  });

  it("detects a missing content JSON file", () => {
    const fakePosts = [
      {
        slug: "nonexistent-fake-post-xyz",
        heroImage: "/images/blog/remote-work-backpacking-rhythm-hero.webp",
        sections: [],
        relatedPostSlugs: [],
        relatedGuideSlugs: [],
      },
    ];
    const errors = validate({
      blogPosts: fakePosts,
      guideSlugs,
      routeSlugs,
      contentBlogDir: resolve(ROOT, "src/content/blog"),
      publicDir: resolve(ROOT, "public"),
    });
    const slugError = errors.find((e) => e.includes("nonexistent-fake-post-xyz"));
    expect(slugError).toBeDefined();
    expect(slugError).toContain("has no matching file");
  });

  it("detects a dangling relatedPostSlugs entry", () => {
    const fakePosts = [
      {
        slug: "remote-work-backpacking-rhythm",
        heroImage: "/images/blog/remote-work-backpacking-rhythm-hero.webp",
        sections: [],
        relatedPostSlugs: ["totally-fake-slug-that-does-not-exist"],
        relatedGuideSlugs: [],
      },
    ];
    const errors = validate({
      blogPosts: fakePosts,
      guideSlugs,
      routeSlugs,
      contentBlogDir: resolve(ROOT, "src/content/blog"),
      publicDir: resolve(ROOT, "public"),
    });
    const relatedError = errors.find((e) =>
      e.includes("totally-fake-slug-that-does-not-exist")
    );
    expect(relatedError).toBeDefined();
    expect(relatedError).toContain("relatedPostSlugs contains unknown slug");
  });

  it("detects a dangling relatedGuideSlugs entry", () => {
    const fakePosts = [
      {
        slug: "remote-work-backpacking-rhythm",
        heroImage: "/images/blog/remote-work-backpacking-rhythm-hero.webp",
        sections: [],
        relatedPostSlugs: [],
        relatedGuideSlugs: ["nonexistent-city-xyz"],
      },
    ];
    const errors = validate({
      blogPosts: fakePosts,
      guideSlugs,
      routeSlugs,
      contentBlogDir: resolve(ROOT, "src/content/blog"),
      publicDir: resolve(ROOT, "public"),
    });
    const guideError = errors.find((e) => e.includes("nonexistent-city-xyz"));
    expect(guideError).toBeDefined();
    expect(guideError).toContain("relatedGuideSlugs contains unknown slug");
  });
});
