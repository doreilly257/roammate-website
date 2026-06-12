import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf-8");
}

function getHeroMinHeight(source: string, selector: string): string | null {
  const escapedSelector = selector.replace(".", "\\.");
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*min-height:\\s*([^;]+);`));
  return match?.[1]?.trim() ?? null;
}

describe("hero layout heights", () => {
  it("keeps blog index and blog post heroes aligned with full-height reference heroes", () => {
    const blogIndex = read("src/pages/blog/index.astro");
    const blogPostLayout = read("src/layouts/BlogPostLayout.astro");
    const aboutPage = read("src/pages/about.astro");
    const cityGuideLayout = read("src/layouts/CityGuideLayout.astro");

    expect(getHeroMinHeight(aboutPage, ".about-hero")).toBe("100vh");
    expect(getHeroMinHeight(cityGuideLayout, ".guide-hero")).toBe("100vh");
    expect(getHeroMinHeight(blogIndex, ".blog-hero")).toBe("100vh");
    expect(getHeroMinHeight(blogPostLayout, ".blog-post-hero")).toBe("100vh");
  });
});
