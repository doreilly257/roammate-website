import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve } from "path";
import { validateBuiltLinks } from "../validate.ts";

let dist: string;

function page(path: string, html: string) {
  const full = resolve(dist, path);
  mkdirSync(resolve(full, ".."), { recursive: true });
  writeFileSync(full, html);
}

beforeEach(() => {
  dist = mkdtempSync(resolve(tmpdir(), "dist-"));
});
afterEach(() => rmSync(dist, { recursive: true, force: true }));

describe("validateBuiltLinks", () => {
  it("passes when every internal reference resolves", () => {
    page("index.html", `<a href="/about/">About</a><img src="/images/a.webp">`);
    page("about/index.html", `<a href="/">Home</a>`);
    page("images/a.webp", "x");
    expect(validateBuiltLinks(dist)).toEqual([]);
  });

  // The exact shape of the companions bug: the collection value was fine, but
  // the template rebuilt the path from the slug and emitted one that 404s.
  it("catches a hero image referenced only from an inline background-image", () => {
    page("companions/mumbai/index.html",
      `<div style="background-image: linear-gradient(#000,#000), url('/images/guides/mumbai-hero.webp');"></div>`);
    page("images/guides/delhi-hero.webp", "x");
    const errors = validateBuiltLinks(dist);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/images/guides/mumbai-hero.webp");
    expect(errors[0]).toContain("/companions/mumbai/index.html");
  });

  it("catches a dead preload href", () => {
    page("a/index.html", `<link rel="preload" as="image" href="/images/missing.webp">`);
    expect(validateBuiltLinks(dist)[0]).toContain("/images/missing.webp");
  });

  it("catches a link missing its trailing slash and says so", () => {
    page("terms/index.html", `<a href="/privacy">Privacy</a>`);
    page("privacy/index.html", `ok`);
    const errors = validateBuiltLinks(dist);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("add the trailing slash");
  });

  it("checks each srcset candidate, not just the first", () => {
    page("a/index.html", `<img srcset="/i/ok.webp 1x, /i/gone.webp 2x">`);
    page("i/ok.webp", "x");
    expect(validateBuiltLinks(dist)[0]).toContain("/i/gone.webp");
  });

  it("ignores external, anchor, mailto and data references", () => {
    page("a/index.html",
      `<a href="https://apps.apple.com/x">s</a><a href="#top">t</a>` +
      `<a href="mailto:a@b.com">m</a><img src="data:image/gif;base64,R0lGOD">`);
    expect(validateBuiltLinks(dist)).toEqual([]);
  });

  it("ignores query strings and fragments when resolving", () => {
    page("a/index.html", `<a href="/about/?utm=x#top">About</a>`);
    page("about/index.html", "ok");
    expect(validateBuiltLinks(dist)).toEqual([]);
  });

  it("reports each broken target once, not once per page", () => {
    page("a/index.html", `<img src="/i/gone.webp">`);
    page("b/index.html", `<img src="/i/gone.webp">`);
    expect(validateBuiltLinks(dist)).toHaveLength(1);
  });
});
