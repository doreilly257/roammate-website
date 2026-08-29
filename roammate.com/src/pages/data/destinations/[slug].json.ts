import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

/** Full structured record for one destination. Index lives at /data/destinations.json */

const ORIGIN = 'https://roammate.com';

export const getStaticPaths: GetStaticPaths = async () => {
  const guides = await getCollection('guides');
  return guides
    .filter((g) => g.data.type === 'city')
    .map((g) => ({ params: { slug: (g.data as any).slug }, props: { data: g.data } }));
};

export const GET: APIRoute = async ({ props }) => {
  const d = (props as any).data;
  const days = Object.keys(d.itineraries ?? {}).map(Number).sort((a, b) => a - b);

  return new Response(
    JSON.stringify(
      {
        slug: d.slug,
        name: d.heroCity,
        country: d.heroCountry,
        region: d.heroRegion,
        summary: d.heroSubtitle,
        source: `${ORIGIN}/guides/${d.slug}/`,
        license: 'CC-BY-4.0',
        quick_facts: (d.quickFacts ?? []).map((f: any) => ({
          label: f.label,
          value: f.value,
          detail: f.detail,
        })),
        itineraries: days.map((n) => ({
          days: n,
          url: `${ORIGIN}/itinerary/${d.slug}-${n}-day/`,
          plan: (d.itineraries[String(n)] ?? []).map((day: any) => ({
            day: day.num,
            title: day.title,
            periods: (day.periods ?? []).map((p: any) => ({
              time: p.time,
              title: p.title,
              description: p.text,
              tip: p.tip ?? null,
            })),
          })),
        })),
        budget: {
          intro: d.budgetIntro,
          breakdown: (d.budgetBreakdown ?? []).map((r: any) => ({
            category: r.category,
            budget: r.budget,
            midrange: r.midrange ?? r.mid ?? null,
            splurge: r.splurge ?? null,
            notes: r.notes ?? null,
          })),
          // Tips are authored as either a string or {title,text}; normalise to one shape.
          tips: (d.budgetTips ?? []).map((t: any) =>
            typeof t === 'string' ? { title: null, text: t } : { title: t.title, text: t.text }
          ),
        },
        practical_info: (d.practicalInfo ?? []).map((p: any) => ({
          title: p.title,
          items: p.items,
        })),
        cultural_tips: (d.culturalTips ?? []).map((t: any) =>
          typeof t === 'string' ? { title: null, text: t } : { title: t.title, text: t.text }
        ),
      },
      null,
      2
    ),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
};
