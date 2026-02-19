import type { APIContext } from "astro";
import { allGuides, cityGuideSlugs } from "../data/guides";
import { allBlogPosts } from "../data/blog";
import { getFeedItems } from "../lib/feed";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(context: APIContext) {
  const site = context.site!;
  const items = getFeedItems(allGuides, cityGuideSlugs, allBlogPosts);
  const updated = items
    .map((item) => item.pubDate)
    .sort((a, b) => b.getTime() - a.getTime())[0]
    ?.toISOString() ?? new Date().toISOString();

  const entries = items
    .map((item) => {
      const href = new URL(item.link, site).href;
      return `
  <entry>
    <title>${escapeXml(item.title)}</title>
    <id>${escapeXml(href)}</id>
    <link href="${escapeXml(href)}" />
    <updated>${item.pubDate.toISOString()}</updated>
    <published>${item.pubDate.toISOString()}</published>
    <summary>${escapeXml(item.description)}</summary>
  </entry>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>roammate — Travel Guides, Blog &amp; Backpacker Routes</title>
  <id>${escapeXml(new URL("/atom.xml", site).href)}</id>
  <link href="${escapeXml(new URL("/atom.xml", site).href)}" rel="self" />
  <link href="${escapeXml(site.href)}" />
  <updated>${updated}</updated>
  <author>
    <name>roammate</name>
  </author>
  <subtitle>City guides, place guides, blog posts, and multi-month backpacker routes for independent travellers. Budget tips, itineraries, and local advice.</subtitle>${entries}
</feed>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
    },
  });
}
