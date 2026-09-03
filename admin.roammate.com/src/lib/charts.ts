/**
 * Server-rendered SVG charts.
 *
 * NO CHART LIBRARY, ON PURPOSE. Every page here is server-rendered and ships no
 * client JavaScript; adding a charting library would mean shipping a runtime and
 * a hydration step to draw shapes we can emit directly. These return SVG
 * strings, so a chart costs the same as a table.
 *
 * EVERY CHART TYPE EARNS ITS PLACE. A pie for parts of one whole, a bar for
 * comparing magnitudes, a scatter for two variables per entity, a stacked area
 * for composition over time, a funnel for sequential loss. Picking the wrong one
 * is worse than a table, so each function documents what it is FOR.
 *
 * Colours come from the same tokens as the rest of the console and are passed in
 * rather than hardcoded, so semantic colour (good/warning/critical) stays
 * meaningful and is never used decoratively.
 */

const PALETTE = ['#ff6b35', '#3ecf8e', '#5b9df9', '#f5a524', '#c084fc', '#f2545b', '#2dd4bf', '#94a3b8'];

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

const fmt = (n: number) => n.toLocaleString('en-GB');

// ---------------------------------------------------------------------------

export type Slice = { label: string; value: number; colour?: string };

/**
 * DONUT — parts of a single whole. Only use when the values genuinely sum to
 * something meaningful; otherwise a bar chart is honest and this is not.
 */
export function donut(slices: Slice[], size = 168, thickness = 26): string {
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (total <= 0) return `<div class="chart-empty">No data</div>`;
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const rings = slices.map((s, i) => {
    const frac = s.value / total;
    const dash = frac * circumference;
    const el = `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none"
      stroke="${s.colour ?? PALETTE[i % PALETTE.length]}" stroke-width="${thickness}"
      stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 ${cx} ${cx})"><title>${esc(s.label)}: ${fmt(s.value)}</title></circle>`;
    offset += dash;
    return el;
  }).join('');

  const legend = slices.map((s, i) => `
    <div class="lg-row">
      <span class="lg-dot" style="background:${s.colour ?? PALETTE[i % PALETTE.length]}"></span>
      <span class="lg-label">${esc(s.label)}</span>
      <span class="lg-val">${fmt(s.value)}</span>
      <span class="lg-pct">${Math.round((s.value / total) * 100)}%</span>
    </div>`).join('');

  return `<div class="chart-donut">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img">
      ${rings}
      <text x="${cx}" y="${cx - 2}" text-anchor="middle" class="donut-total">${fmt(total)}</text>
      <text x="${cx}" y="${cx + 14}" text-anchor="middle" class="donut-cap">total</text>
    </svg>
    <div class="chart-legend">${legend}</div>
  </div>`;
}

/**
 * HORIZONTAL BARS — comparing magnitudes across named categories. The default
 * when you are not sure: it is the hardest chart to mislead with.
 */
export function bars(rows: Slice[], opts: { max?: number; showPct?: boolean; href?: (r: Slice) => string | null } = {}): string {
  if (!rows.length) return `<div class="chart-empty">No data</div>`;
  const max = opts.max ?? Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((a, r) => a + r.value, 0);
  return `<div class="chart-bars">${rows.map((r, i) => {
    const w = max > 0 ? Math.max(r.value > 0 ? 1.5 : 0, (r.value / max) * 100) : 0;
    const label = opts.href?.(r)
      ? `<a href="${esc(opts.href(r))}" class="bar-label">${esc(r.label)}</a>`
      : `<span class="bar-label">${esc(r.label)}</span>`;
    return `<div class="bar-row">
      ${label}
      <span class="bar-track"><span class="bar-fill" style="width:${w.toFixed(1)}%;background:${r.colour ?? PALETTE[i % PALETTE.length]}"></span></span>
      <span class="bar-val">${fmt(r.value)}</span>
      ${opts.showPct && total > 0 ? `<span class="bar-pct">${Math.round((r.value / total) * 100)}%</span>` : ''}
    </div>`;
  }).join('')}</div>`;
}

/**
 * FUNNEL — sequential stages where each is a subset of the one before. Renders
 * the DROP as well as the remainder, because the gap is the finding.
 */
export function funnel(stages: Array<{ label: string; value: number }>): string {
  if (!stages.length) return `<div class="chart-empty">No data</div>`;
  const top = stages[0].value || 1;
  return `<div class="chart-funnel">${stages.map((s, i) => {
    const w = (s.value / top) * 100;
    const prev = i > 0 ? stages[i - 1].value : null;
    const lost = prev === null ? 0 : prev - s.value;
    const lostPct = prev ? Math.round((lost / prev) * 100) : 0;
    return `<div class="fn-row">
      <div class="fn-head"><span>${esc(s.label)}</span><span class="fn-val">${fmt(s.value)}</span></div>
      <div class="fn-track"><div class="fn-fill" style="width:${w.toFixed(1)}%"></div></div>
      ${prev !== null && lost > 0
        ? `<div class="fn-drop">&minus;${fmt(lost)} (${lostPct}%) did not reach this step</div>`
        : ''}
    </div>`;
  }).join('')}</div>`;
}

export type Point = { x: number; y: number; label: string; href?: string };

/**
 * SCATTER — two measures per entity, to expose the relationship (or its
 * absence). Used here for demand against supply per city: the diagonal is
 * balance, and everything off it is a gap.
 */
export function scatter(
  points: Point[],
  opts: { width?: number; height?: number; xLabel: string; yLabel: string },
): string {
  const w = opts.width ?? 420, h = opts.height ?? 260;
  const pad = { l: 44, r: 14, t: 14, b: 34 };
  if (!points.length) return `<div class="chart-empty">No data</div>`;
  const maxX = Math.max(...points.map((p) => p.x), 1);
  const maxY = Math.max(...points.map((p) => p.y), 1);
  const px = (x: number) => pad.l + (x / maxX) * (w - pad.l - pad.r);
  const py = (y: number) => h - pad.b - (y / maxY) * (h - pad.t - pad.b);

  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const y = py(maxY * f);
    return `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y}" y2="${y}" class="grid"/>
            <text x="${pad.l - 7}" y="${y + 3}" text-anchor="end" class="axis">${fmt(Math.round(maxY * f))}</text>`;
  }).join('');

  const dots = points.map((p) => {
    const c = `<circle cx="${px(p.x).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="4.5" class="dot">
      <title>${esc(p.label)} — ${opts.xLabel}: ${fmt(p.x)}, ${opts.yLabel}: ${fmt(p.y)}</title></circle>`;
    return p.href ? `<a href="${esc(p.href)}">${c}</a>` : c;
  }).join('');

  return `<svg width="100%" viewBox="0 0 ${w} ${h}" class="chart-scatter" role="img">
    ${gridY}
    <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" class="axis-line"/>
    <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" class="axis-line"/>
    ${dots}
    <text x="${(w + pad.l) / 2}" y="${h - 6}" text-anchor="middle" class="axis">${esc(opts.xLabel)}</text>
    <text x="10" y="${(h - pad.b) / 2}" transform="rotate(-90 10 ${(h - pad.b) / 2})" text-anchor="middle" class="axis">${esc(opts.yLabel)}</text>
  </svg>`;
}

/**
 * RIBBON — a stacked area over an ordered axis, for composition changing over
 * time. Reads as flow rather than as discrete bars, which suits cohorts.
 */
export function ribbon(
  categories: string[],
  rows: Array<{ label: string; values: number[] }>,
  opts: { width?: number; height?: number } = {},
): string {
  const w = opts.width ?? 460, h = opts.height ?? 200;
  const pad = { l: 38, r: 12, t: 12, b: 28 };
  if (!rows.length || !categories.length) return `<div class="chart-empty">No data</div>`;

  const totals = categories.map((_, i) => rows.reduce((a, r) => a + (r.values[i] ?? 0), 0));
  const maxTotal = Math.max(...totals, 1);
  const step = categories.length > 1 ? (w - pad.l - pad.r) / (categories.length - 1) : 0;
  const px = (i: number) => pad.l + i * step;
  const py = (v: number) => h - pad.b - (v / maxTotal) * (h - pad.t - pad.b);

  // Build cumulative bands bottom-up so each ribbon sits on the one below it.
  const running = categories.map(() => 0);
  const bands = rows.map((r, ri) => {
    const lower = running.slice();
    const upper = running.map((v, i) => v + (r.values[i] ?? 0));
    for (let i = 0; i < running.length; i++) running[i] = upper[i];
    const top = upper.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' L');
    const bottom = lower.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).reverse().join(' L');
    return `<path d="M${top} L${bottom} Z" fill="${PALETTE[ri % PALETTE.length]}" fill-opacity="0.75">
      <title>${esc(r.label)}</title></path>`;
  }).join('');

  const ticks = categories.map((cat, i) =>
    i % Math.ceil(categories.length / 6) === 0
      ? `<text x="${px(i)}" y="${h - 9}" text-anchor="middle" class="axis">${esc(cat)}</text>` : ''
  ).join('');

  const legend = rows.map((r, i) =>
    `<div class="lg-row"><span class="lg-dot" style="background:${PALETTE[i % PALETTE.length]}"></span>
     <span class="lg-label">${esc(r.label)}</span></div>`).join('');

  return `<div class="chart-ribbon-wrap">
    <svg width="100%" viewBox="0 0 ${w} ${h}" class="chart-ribbon" role="img">
      <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" class="axis-line"/>
      <text x="${pad.l - 6}" y="${py(maxTotal) + 4}" text-anchor="end" class="axis">${fmt(maxTotal)}</text>
      ${bands}${ticks}
    </svg>
    <div class="chart-legend row">${legend}</div>
  </div>`;
}

/**
 * FILL METER — one column's populated share. A dedicated shape because a data
 * quality page shows dozens of these and a full bar chart per column would bury
 * the outliers that matter.
 */
export function fillMeter(filled: number, total: number): string {
  const pct = total > 0 ? (filled / total) * 100 : 0;
  const tone = pct >= 80 ? 'ok' : pct >= 40 ? 'warn' : 'bad';
  return `<span class="meter ${tone}" title="${fmt(filled)} of ${fmt(total)} populated">
    <span class="meter-fill" style="width:${pct.toFixed(1)}%"></span>
  </span><span class="meter-pct ${tone}">${pct.toFixed(0)}%</span>`;
}

export { PALETTE };
