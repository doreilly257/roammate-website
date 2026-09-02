/** Formatting helpers. Server-side only, so no locale negotiation: the console
 *  is operated from one place and stable output beats clever output. */

export function num(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0';
  return n.toLocaleString('en-GB');
}

/** D1 stores timestamps as "YYYY-MM-DD HH:MM:SS" (SQLite datetime('now')), which
 *  Safari will not parse without the T and Z. Normalise before constructing. */
export function parseDbDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateTime(value: string | null | undefined): string {
  const d = parseDbDate(value);
  if (!d) return '--';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

export function relative(value: string | null | undefined): string {
  const d = parseDbDate(value);
  if (!d) return '--';
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export function truncate(s: string | null | undefined, n: number): string {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** Percentage of a total, guarding the zero case so a fresh database renders
 *  "0%" rather than "NaN%". */
export function pct(part: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

/** Inline SVG sparkline path. Server-rendered so the console needs no chart
 *  library and no client JS, which keeps it fast and CSP-simple. */
export function sparkline(values: number[], width = 160, height = 36): { path: string; area: string; max: number } {
  if (values.length === 0) return { path: '', area: '', max: 0 };
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = height - (v / max) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return {
    path: `M${pts.join(' L')}`,
    area: `M0,${height} L${pts.join(' L')} L${width},${height} Z`,
    max,
  };
}
