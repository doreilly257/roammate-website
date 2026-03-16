import { describe, it, expect } from "vitest";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { validate } from "../validate.ts";
import { blogPosts } from "../../src/data/blog.ts";
import { allGuides, backpackerRoutes } from "../../src/data/guides.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const guideSlugs = new Set(allGuides.map((g) => g.slug));
const routeSlugs = new Set(backpackerRoutes.map((r) => r.slug));

describe("validate", () => {
  it("passes on current (known-good) state", () => {
    const errors = validate({ blogPosts, guideSlugs, routeSlugs });
    expect(errors).toEqual([]);
  });

  it("detects a missing blog.ts slug (no matching .astro file)", () => {
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
      blogPageDir: resolve(ROOT, "src/pages/blog"),
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
      blogPageDir: resolve(ROOT, "src/pages/blog"),
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
      blogPageDir: resolve(ROOT, "src/pages/blog"),
      publicDir: resolve(ROOT, "public"),
    });
    const guideError = errors.find((e) => e.includes("nonexistent-city-xyz"));
    expect(guideError).toBeDefined();
    expect(guideError).toContain("relatedGuideSlugs contains unknown slug");
  });
});
