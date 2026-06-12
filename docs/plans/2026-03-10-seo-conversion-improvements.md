# SEO & Conversion Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve App Store download conversion and organic search visibility across four targeted areas.

**Architecture:** Static Astro site (v5). All pages are `.astro` files in `src/pages/`. Blog posts have individual `.astro` files under `src/pages/blog/`. Schema lives in `src/layouts/BaseLayout.astro` and per-layout slots. Styles use CSS custom properties defined in `src/styles/global.css`.

**Tech Stack:** Astro v5, Tailwind-free (raw CSS), PostHog for event tracking, Surge.sh deployment.

**Context:** App Store Connect shows 81% of downloads come from App Store Search. The website drove only 3 of 21 total downloads. Average Google search position is 24.1, all branded queries. Goal is to add mid-post conversion touchpoints, fix misleading schema, create non-branded SEO landing pages, and wire up internal linking to the two companion-focused posts.

---

## Task 1: Add mid-post inline CTA to BlogPostLayout

**Why:** The bottom CTA exists but only catches readers who scroll all the way down. A mid-post CTA after section 1 intercepts readers earlier.

**Files:**
- Modify: `roammate.com/src/layouts/BlogPostLayout.astro`

**Step 1: Locate the sections.map() loop**

Open `src/layouts/BlogPostLayout.astro`. Find this block around line 212:

```astro
<div class="blog-post-sections">
  {sections.map((section, index) => {
```

**Step 2: Add inline CTA after section index 0**

Inside the sections.map(), after the closing `</section>` tag of each section, add a conditional that renders a compact CTA banner after the first section only:

```astro
{sections.map((section, index) => {
  const sectionParagraphs = toParagraphs(section.content);
  return (
    <>
      <section class={`blog-post-section reveal ${index % 2 === 1 ? 'is-reversed' : ''}`}>
        <!-- existing section content unchanged -->
        <div class="blog-post-section-copy">
          {section.kicker && <p class="blog-post-section-kicker">{section.kicker}</p>}
          <h2>{section.heading}</h2>
          {sectionParagraphs.map((paragraph) => (
            <p set:html={renderInlineLinks(paragraph)} />
          ))}
          {section.quote && <blockquote>{section.quote}</blockquote>}
        </div>
        {section.image && (
          <figure class="blog-post-section-media">
            <img src={section.image} alt={section.imageAlt || `Illustration for ${section.heading}`} loading="lazy" width="1200" height="800" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 800px" />
          </figure>
        )}
      </section>
      {index === 0 && (
        <div class="blog-midpost-cta reveal">
          <p class="blog-midpost-cta-text">Find a travel companion who matches your style and budget</p>
          <a
            href="https://apps.apple.com/app/id6758834253?pt=118224460&ct=blog-midpost-cta&mt=8"
            target="_blank"
            rel="noopener"
            class="blog-midpost-cta-btn"
            data-ph-event="blog_midpost_cta_appstore_click"
          >Download Roammate — Free</a>
        </div>
      )}
    </>
  );
})}
```

**Step 3: Add CSS for the mid-post CTA**

Add this to the `<style>` block (after the existing `.blog-post-sections` styles):

```css
.blog-midpost-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding: 24px 32px;
  background: linear-gradient(135deg, rgba(196, 86, 42, 0.12) 0%, rgba(196, 86, 42, 0.06) 100%);
  border: 1px solid rgba(196, 86, 42, 0.25);
  border-radius: 18px;
  margin-top: -16px;
}

.blog-midpost-cta-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-cream);
  line-height: 1.4;
  margin: 0;
}

.blog-midpost-cta-btn {
  flex-shrink: 0;
  display: inline-block;
  padding: 12px 24px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.3px;
  background: var(--color-terracotta);
  color: #fff;
  text-decoration: none;
  transition: background 0.3s, transform 0.3s var(--ease-out-expo);
  white-space: nowrap;
}

.blog-midpost-cta-btn:hover {
  background: #b34f28;
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .blog-midpost-cta {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
  }
}
```

**Step 4: Verify build**

```bash
cd roammate.com && npm run build 2>&1 | tail -5
```
Expected: `✓ Completed` with no errors.

**Step 5: Commit**

```bash
git add roammate.com/src/layouts/BlogPostLayout.astro
git commit -m "feat: add mid-post inline CTA to blog posts for earlier App Store conversion"
```

---

## Task 2: Fix fake aggregateRating in SoftwareApplication schema

**Why:** `BaseLayout.astro` hardcodes `ratingValue: "4.8", ratingCount: "127"` which are fabricated. This can trigger a Google manual action for misleading structured data. Remove until real ratings exist.

**Files:**
- Modify: `roammate.com/src/layouts/BaseLayout.astro` (lines ~83–104)

**Step 1: Find the SoftwareApplication schema block**

Look for this in `BaseLayout.astro`:
```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "4.8",
  "ratingCount": "127"
}
```

**Step 2: Remove the aggregateRating object**

Delete the entire `aggregateRating` key from the schema. The SoftwareApplication schema should remain valid without it. The result should look like:

```astro
{isHome && (
  <script type="application/ld+json" set:html={JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "roammate",
    "applicationCategory": "TravelApplication",
    "operatingSystem": "iOS",
    "url": "https://roammate.com/",
    "downloadUrl": "https://apps.apple.com/app/id6758834253",
    "description": "Travel companion app to connect with fellow travelers, share experiences, and split costs.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "category": "Free"
    }
  })} />
)}
```

**Step 3: Verify build**

```bash
cd roammate.com && npm run build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add roammate.com/src/layouts/BaseLayout.astro
git commit -m "fix: remove fabricated aggregateRating from SoftwareApplication schema"
```

---

## Task 3: Add internal links to companion posts from social-category posts

**Why:** Five high-traffic social posts don't link to `finding-travel-companions` or `why-roammate-perfect-companion`. Adding them creates a topic cluster that signals relevance to Google and funnels readers toward the most conversion-focused content.

**Files to modify** (each is a separate .astro file):
- `roammate.com/src/pages/blog/meeting-people-solo-travel.astro`
- `roammate.com/src/pages/blog/hostel-social-scene-navigation.astro`
- `roammate.com/src/pages/blog/solo-travel-vs-group-tours.astro`
- `roammate.com/src/pages/blog/travel-friendship-building.astro`
- `roammate.com/src/pages/blog/social-energy-management-abroad.astro`

**Step 1: Update meeting-people-solo-travel.astro**

Find the `relatedPostSlugs` array (currently line ~30):
```js
relatedPostSlugs: ["social-energy-management-abroad","solo-female-travel-operations","hostel-selection-operator-checklist","travel-friendship-building"],
```

Replace with (companion posts first so they appear in the top 3):
```js
relatedPostSlugs: ["finding-travel-companions", "why-roammate-perfect-companion", "social-energy-management-abroad", "hostel-selection-operator-checklist"],
```

**Step 2: Update hostel-social-scene-navigation.astro**

Find its `relatedPostSlugs`:
```js
relatedPostSlugs: ["hostel-selection-operator-checklist", "social-energy-management-abroad", "meeting-people-solo-travel", "travel-friendship-building"],
```
Replace with:
```js
relatedPostSlugs: ["finding-travel-companions", "meeting-people-solo-travel", "social-energy-management-abroad", "travel-friendship-building"],
```

**Step 3: Update solo-travel-vs-group-tours.astro**

Find its `relatedPostSlugs`:
```js
relatedPostSlugs: ["meeting-people-solo-travel", "solo-female-travel-operations", "year-of-backpacking-strategy", "first-backpacking-trip-checklist"],
```
Replace with:
```js
relatedPostSlugs: ["finding-travel-companions", "why-roammate-perfect-companion", "meeting-people-solo-travel", "solo-female-travel-operations"],
```

**Step 4: Update travel-friendship-building.astro**

Find its `relatedPostSlugs` — read the file first to locate the exact string. Add `finding-travel-companions` as first entry and ensure total stays at 4.

**Step 5: Update social-energy-management-abroad.astro**

Find its `relatedPostSlugs` — read the file first. Add `finding-travel-companions` as first entry.

**Step 6: Verify build**

```bash
cd roammate.com && npm run build 2>&1 | tail -5
```

**Step 7: Commit**

```bash
git add roammate.com/src/pages/blog/meeting-people-solo-travel.astro \
        roammate.com/src/pages/blog/hostel-social-scene-navigation.astro \
        roammate.com/src/pages/blog/solo-travel-vs-group-tours.astro \
        roammate.com/src/pages/blog/travel-friendship-building.astro \
        roammate.com/src/pages/blog/social-energy-management-abroad.astro
git commit -m "feat: wire internal links from social posts to companion-finding posts"
```

---

## Task 4: Create non-branded SEO landing page — /find-travel-companion/

**Why:** All current Google traffic is branded. This page targets "find a travel companion", "travel companion app", "travel buddy finder" — the highest-volume non-branded queries for this product.

**Files:**
- Create: `roammate.com/src/pages/find-travel-companion.astro`

**Step 1: Create the page**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout
  title="Find a Travel Companion — roammate App"
  description="Find a travel companion who matches your style, budget, and destination. roammate connects solo travelers for shared adventures, cost splitting, and safer trips. Free on iOS."
>
  <Fragment slot="head">
    <script type="application/ld+json" set:html={JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Find a Travel Companion",
      "url": "https://roammate.com/find-travel-companion/",
      "description": "roammate matches solo travelers by style, budget, and destination to find compatible travel companions.",
    })} />
  </Fragment>

  <section class="ftc-hero">
    <div class="ftc-hero-inner">
      <div class="section-label section-label--center">Travel Companion Finder</div>
      <h1 class="ftc-title">Find a <em>travel companion</em> who actually matches</h1>
      <p class="ftc-subtitle">Not just someone nearby — someone compatible. roammate matches by travel style, budget, and destination so you share the right trip with the right person.</p>
      <div class="ftc-hero-actions">
        <a
          href="https://apps.apple.com/app/id6758834253?pt=118224460&ct=find-travel-companion-hero&mt=8"
          target="_blank"
          rel="noopener"
          class="ftc-btn ftc-btn--primary"
          data-ph-event="ftc_hero_appstore_click"
        >Download Free on iOS</a>
        <a href="/how-it-works/" class="ftc-btn ftc-btn--ghost">See how it works</a>
      </div>
    </div>
  </section>

  <section class="ftc-why">
    <div class="ftc-why-inner">
      <div class="section-label">Why It Matters</div>
      <h2 class="ftc-section-heading">The wrong travel companion ruins a trip.<br><em>The right one changes your life.</em></h2>
      <div class="ftc-cards">
        <div class="ftc-card reveal">
          <div class="ftc-card-icon">💸</div>
          <h3>Cut costs in half</h3>
          <p>Split private rooms, taxis, tours, and rental cars. A matched companion saves $150–300 per week in Southeast Asia alone.</p>
        </div>
        <div class="ftc-card reveal">
          <div class="ftc-card-icon">🔒</div>
          <h3>Travel safer</h3>
          <p>Verified profiles, identity checks, and a shared itinerary mean you know who you're meeting before you go anywhere.</p>
        </div>
        <div class="ftc-card reveal">
          <div class="ftc-card-icon">🎯</div>
          <h3>Matched by style, not luck</h3>
          <p>Early riser or late starter? Budget backpacker or midrange? Adventure or culture? roammate filters by all of it.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="ftc-how">
    <div class="ftc-how-inner">
      <div class="section-label">How It Works</div>
      <h2 class="ftc-section-heading">From solo to <em>matched</em> in minutes</h2>
      <div class="ftc-steps">
        <div class="ftc-step reveal">
          <span class="ftc-step-num">01</span>
          <h3>Build your travel profile</h3>
          <p>Set your travel style, budget bracket, and destinations. The more honest you are, the better your matches.</p>
        </div>
        <div class="ftc-step reveal">
          <span class="ftc-step-num">02</span>
          <h3>Browse compatible travelers</h3>
          <p>See travelers with overlapping destinations, matching budgets, and compatible styles — before starting any conversation.</p>
        </div>
        <div class="ftc-step reveal">
          <span class="ftc-step-num">03</span>
          <h3>Connect and go</h3>
          <p>Message, meet, and take it from there. Share a guesthouse, split a tour, or just grab dinner — whatever works.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="ftc-cta">
    <div class="ftc-cta-inner">
      <p class="ftc-cta-label">Free on iOS</p>
      <h2 class="ftc-cta-heading">Your next travel companion is <em>already on roammate</em></h2>
      <p class="ftc-cta-body">Download free. Build your profile. Find someone who travels the way you do.</p>
      <a
        href="https://apps.apple.com/app/id6758834253?pt=118224460&ct=find-travel-companion-cta&mt=8"
        target="_blank"
        rel="noopener"
        class="ftc-btn ftc-btn--primary ftc-btn--large"
        data-ph-event="ftc_bottom_appstore_click"
      >Download on the App Store — Free</a>
      <p class="ftc-cta-sub">Also: <a href="/blog/finding-travel-companions/">Read our guide to finding travel companions</a></p>
    </div>
  </section>

  <section class="ftc-related">
    <div class="ftc-related-inner">
      <div class="section-label">From The Blog</div>
      <h2 class="ftc-section-heading">More on finding <em>travel companions</em></h2>
      <div class="ftc-related-links">
        <a href="/blog/finding-travel-companions/" class="ftc-related-link">How to Find Reliable Travel Companions in New Cities →</a>
        <a href="/blog/meeting-people-solo-travel/" class="ftc-related-link">Meeting People as a Solo Traveler →</a>
        <a href="/blog/travel-friendship-building/" class="ftc-related-link">Building Lasting Travel Friendships →</a>
        <a href="/blog/hostel-social-scene-navigation/" class="ftc-related-link">Navigating the Hostel Social Scene →</a>
        <a href="/blog/solo-travel-vs-group-tours/" class="ftc-related-link">Solo Travel vs Group Tours →</a>
      </div>
    </div>
  </section>
</BaseLayout>

<style>
  /* ======================== HERO ======================== */
  .ftc-hero {
    padding: 160px 40px 100px;
    text-align: center;
    position: relative;
  }

  .ftc-hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 80%, rgba(196, 86, 42, 0.05) 0%, transparent 60%);
    pointer-events: none;
  }

  .ftc-hero-inner {
    position: relative;
    z-index: 1;
    max-width: 780px;
    margin: 0 auto;
  }

  .ftc-title {
    font-family: var(--font-display);
    font-size: clamp(44px, 7vw, 80px);
    font-weight: 900;
    line-height: 1.02;
    color: var(--color-cream);
    margin-bottom: 24px;
  }

  .ftc-title em {
    font-style: italic;
    font-weight: 400;
    color: var(--color-terracotta-light);
  }

  .ftc-subtitle {
    font-size: clamp(17px, 2vw, 21px);
    color: rgba(245, 241, 235, 0.75);
    line-height: 1.6;
    margin-bottom: 40px;
  }

  .ftc-hero-actions {
    display: flex;
    gap: 14px;
    justify-content: center;
    flex-wrap: wrap;
  }

  /* ======================== BUTTONS ======================== */
  .ftc-btn {
    display: inline-block;
    padding: 15px 32px;
    border-radius: 999px;
    font-size: 15px;
    font-weight: 700;
    text-decoration: none;
    transition: background 0.3s, transform 0.3s var(--ease-out-expo);
    letter-spacing: 0.3px;
  }

  .ftc-btn--primary {
    background: var(--color-terracotta);
    color: #fff;
  }

  .ftc-btn--primary:hover {
    background: #b34f28;
    transform: translateY(-2px);
  }

  .ftc-btn--ghost {
    background: transparent;
    border: 1px solid rgba(245, 241, 235, 0.25);
    color: rgba(245, 241, 235, 0.8);
  }

  .ftc-btn--ghost:hover {
    border-color: rgba(245, 241, 235, 0.5);
    color: #fff;
  }

  .ftc-btn--large {
    padding: 18px 40px;
    font-size: 16px;
  }

  /* ======================== SHARED ======================== */
  .ftc-section-heading {
    font-family: var(--font-display);
    font-size: clamp(32px, 4.5vw, 52px);
    font-weight: 900;
    line-height: 1.1;
    color: var(--color-cream);
    margin-bottom: 48px;
  }

  .ftc-section-heading em {
    font-style: italic;
    font-weight: 400;
    color: var(--color-terracotta-light);
  }

  /* ======================== WHY ======================== */
  .ftc-why {
    padding: 80px 40px;
  }

  .ftc-why-inner {
    max-width: 1100px;
    margin: 0 auto;
  }

  .ftc-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .ftc-card {
    padding: 36px 28px;
    background: rgba(247, 242, 234, 0.04);
    border: 1px solid rgba(196, 86, 42, 0.15);
    border-radius: 20px;
  }

  .ftc-card-icon {
    font-size: 32px;
    margin-bottom: 16px;
  }

  .ftc-card h3 {
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--color-cream);
    margin-bottom: 10px;
    line-height: 1.2;
  }

  .ftc-card p {
    font-size: 15px;
    line-height: 1.7;
    color: var(--color-text-muted);
  }

  /* ======================== HOW ======================== */
  .ftc-how {
    padding: 80px 40px;
    background: rgba(247, 242, 234, 0.02);
    border-top: 1px solid rgba(196, 86, 42, 0.08);
    border-bottom: 1px solid rgba(196, 86, 42, 0.08);
  }

  .ftc-how-inner {
    max-width: 900px;
    margin: 0 auto;
  }

  .ftc-steps {
    display: grid;
    gap: 32px;
  }

  .ftc-step {
    display: grid;
    grid-template-columns: 64px 1fr;
    gap: 24px;
    align-items: start;
  }

  .ftc-step-num {
    font-family: var(--font-display);
    font-size: 48px;
    font-weight: 900;
    color: var(--color-terracotta);
    opacity: 0.4;
    line-height: 1;
  }

  .ftc-step h3 {
    font-family: var(--font-display);
    font-size: 24px;
    color: var(--color-cream);
    margin-bottom: 8px;
  }

  .ftc-step p {
    font-size: 15px;
    line-height: 1.7;
    color: var(--color-text-muted);
  }

  /* ======================== CTA ======================== */
  .ftc-cta {
    padding: 80px 40px;
  }

  .ftc-cta-inner {
    max-width: 680px;
    margin: 0 auto;
    text-align: center;
  }

  .ftc-cta-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--color-terracotta);
    margin-bottom: 18px;
  }

  .ftc-cta-heading {
    font-family: var(--font-display);
    font-size: clamp(30px, 4vw, 48px);
    font-weight: 900;
    line-height: 1.1;
    color: var(--color-cream);
    margin-bottom: 16px;
  }

  .ftc-cta-heading em {
    font-style: italic;
    font-weight: 400;
    color: var(--color-terracotta-light);
  }

  .ftc-cta-body {
    font-size: 16px;
    line-height: 1.7;
    color: rgba(245, 241, 235, 0.65);
    margin-bottom: 32px;
  }

  .ftc-cta-sub {
    margin-top: 20px;
    font-size: 14px;
    color: var(--color-text-muted);
  }

  .ftc-cta-sub a {
    color: var(--color-terracotta-light);
  }

  /* ======================== RELATED ======================== */
  .ftc-related {
    padding: 60px 40px 100px;
    border-top: 1px solid rgba(196, 86, 42, 0.08);
  }

  .ftc-related-inner {
    max-width: 700px;
    margin: 0 auto;
  }

  .ftc-related-links {
    display: grid;
    gap: 12px;
  }

  .ftc-related-link {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-cream);
    text-decoration: none;
    padding: 16px 20px;
    border: 1px solid rgba(196, 86, 42, 0.15);
    border-radius: 12px;
    transition: border-color 0.25s, color 0.25s;
  }

  .ftc-related-link:hover {
    border-color: var(--color-terracotta);
    color: var(--color-terracotta-light);
  }

  /* ======================== RESPONSIVE ======================== */
  @media (max-width: 1024px) {
    .ftc-hero { padding: 140px 24px 80px; }
    .ftc-why, .ftc-how, .ftc-cta, .ftc-related { padding-left: 24px; padding-right: 24px; }
    .ftc-cards { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .ftc-hero { padding: 120px 20px 60px; }
    .ftc-why, .ftc-how, .ftc-cta, .ftc-related { padding-left: 20px; padding-right: 20px; }
    .ftc-step { grid-template-columns: 44px 1fr; gap: 16px; }
    .ftc-step-num { font-size: 36px; }
    .ftc-hero-actions { flex-direction: column; align-items: center; }
  }
</style>
```

**Step 2: Verify build and check page renders**

```bash
cd roammate.com && npm run build 2>&1 | grep "find-travel-companion"
```
Expected: `└─ /find-travel-companion/index.html`

**Step 3: Update robots.txt and sitemap**

The sitemap is auto-generated. Confirm `roammate.com/public/robots.txt` does not block `/find-travel-companion/`. If it has specific Allow rules, add this path. No change needed if only `/api/` and `/private/` are blocked.

**Step 4: Commit**

```bash
git add roammate.com/src/pages/find-travel-companion.astro
git commit -m "feat: add /find-travel-companion/ SEO landing page for non-branded search"
```

---

## Task 5: Deploy

```bash
bash deploy.sh
```

Verify live:
```bash
curl -s -o /dev/null -w "%{http_code}" https://roammate.com/find-travel-companion/
```
Expected: `200`

---

## Notes for later

- **Aggregrate rating**: Once real App Store reviews accumulate (target: 10+ reviews), re-add `aggregateRating` to the SoftwareApplication schema in `BaseLayout.astro` with real values from App Store Connect.
- **Second SEO page**: Consider `/meet-travelers/` targeting "meet travelers app" once this page is indexed and performing.
- **Android Play Store**: When Android launches, update all `/#waitlist` Android CTAs to the real Play Store URL across `BlogPostLayout.astro`, `find-travel-companion.astro`, and any other pages.
