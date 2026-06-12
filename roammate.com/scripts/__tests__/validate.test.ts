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

function loadGuidesFromJson(): any[] {
  const contentDir = resolve(ROOT, "src/content/guides");
  const files = readdirSync(contentDir).filter((f) => f.endsWith(".json"));
  return files.map((file) => {
    const data = JSON.parse(readFileSync(resolve(contentDir, file), "utf-8"));
    return { _file: file, ...data };
  });
}

const blogPosts = loadBlogPostsFromJson();
const guideSlugs = loadGuideSlugsFromJson();
const routeSlugs = loadRouteSlugsFromJson();
const guides = loadGuidesFromJson();

describe("validate", () => {
  it("passes on current (known-good) state", () => {
    const errors = validate({ blogPosts, guideSlugs, routeSlugs, guides });
    expect(errors).toEqual([]);
  });

  it("detects a guide with a missing heroImage", () => {
    const errors = validate({
      blogPosts: [],
      guideSlugs,
      routeSlugs,
      guides: [
        { _file: "fake-city.json", type: "city", slug: "fake-city", heroImage: "/images/guides/does-not-exist-xyz.webp" },
      ],
      publicDir: resolve(ROOT, "public"),
    });
    const err = errors.find((e) => e.includes("does-not-exist-xyz.webp"));
    expect(err).toBeDefined();
    expect(err).toContain("heroImage missing");
    expect(err).toContain("fake-city.json");
  });

  it("detects a missing heroImages entry (string and object forms)", () => {
    const errors = validate({
      blogPosts: [],
      guideSlugs,
      routeSlugs,
      guides: [
        {
          _file: "fake-route.json",
          type: "backpacker",
          slug: "fake-route",
          heroImages: ["/images/routes/missing-a-xyz.webp", { src: "/images/routes/missing-b-xyz.webp", alt: "x" }],
        },
      ],
      publicDir: resolve(ROOT, "public"),
    });
    expect(errors.find((e) => e.includes("heroImages[0]") && e.includes("missing-a-xyz.webp"))).toBeDefined();
    expect(errors.find((e) => e.includes("heroImages[1]") && e.includes("missing-b-xyz.webp"))).toBeDefined();
  });

  it("detects a featuredGuides slug that does not resolve to a guide", () => {
    const errors = validate({
      blogPosts: [],
      guideSlugs,
      routeSlugs,
      guides: [
        { _file: "fake-route.json", type: "backpacker", slug: "fake-route", featuredGuides: ["nonexistent-guide-xyz"] },
      ],
      publicDir: resolve(ROOT, "public"),
    });
    const err = errors.find((e) => e.includes("nonexistent-guide-xyz"));
    expect(err).toBeDefined();
    expect(err).toContain("featuredGuides contains unknown guide slug");
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
