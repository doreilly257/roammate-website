import { describe, it, expect } from "vitest";
import { getCitySiblingPages } from "../getCitySiblingPages";

const cityGuideData = {
  itineraries: { "1": [], "3": [], "7": [] },
  budgetBreakdown: [{ category: "Food" }],
  quickFacts: [{ label: "Best Months", value: "Nov–Feb" }],
};

describe("getCitySiblingPages", () => {
  it("emits guide and companions links for a city-guide slug", () => {
    const r = getCitySiblingPages("bangkok", cityGuideData, new Set(["bangkok"]));
    expect(r.guide).toBe("/guides/bangkok/");
    expect(r.companions).toBe("/companions/bangkok/");
  });

  it("suppresses companions but keeps guide link for a non-city-guide (place) slug", () => {
    // /guides/{slug}/ is generated for every guide entry; only companions
    // pages are restricted to curated city slugs.
    const r = getCitySiblingPages("some-place", cityGuideData, new Set(["bangkok"]));
    expect(r.guide).toBe("/guides/some-place/");
    expect(r.companions).toBeNull();
  });

  it("still emits budget, bestTime and itinerary links regardless of city-guide membership", () => {
    const r = getCitySiblingPages("some-place", cityGuideData, new Set());
    expect(r.budget).toBe("/budget/some-place/");
    expect(r.bestTime).toBe("/best-time-to-visit/some-place/");
    expect(r.itinerary).toEqual([
      { slug: "/itinerary/some-place-1-day/", days: 1 },
      { slug: "/itinerary/some-place-3-day/", days: 3 },
      { slug: "/itinerary/some-place-7-day/", days: 7 },
    ]);
  });

  it("nulls budget when no budgetBreakdown and bestTime when no Best Months fact", () => {
    const r = getCitySiblingPages(
      "bangkok",
      { quickFacts: [{ label: "Currency", value: "THB" }] },
      new Set(["bangkok"]),
    );
    expect(r.budget).toBeNull();
    expect(r.bestTime).toBeNull();
    expect(r.itinerary).toEqual([]);
  });
});
