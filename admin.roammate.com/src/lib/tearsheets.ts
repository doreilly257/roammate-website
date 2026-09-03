/**
 * Tear sheet content, built here rather than in the .astro frontmatter.
 *
 * The page is a fragment renderer with almost no logic in it. Keeping the
 * building here means the markup file stays readable, and it avoids stuffing
 * large template literals into Astro frontmatter, which its parser handles
 * poorly.
 *
 * Every tear sheet shows MORE than the table it was opened from: all columns,
 * not the handful a row can fit, plus a chart where one helps.
 */
import { api } from './api';
import { bars, donut } from './charts';
import { dateTime, num, relative, truncate } from './format';

type Env = { API_BASE_URL: string; ADMIN_API_KEY: string };
type Row = Record<string, unknown>;

export type Sheet = { title: string; subtitle: string; body: string; error: string | null };

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/** '--' for anything absent, so an empty cell is never mistaken for a zero. */
function val(v: unknown): string {
  if (v === null || v === undefined || v === '') return '--';
  return esc(v);
}

function fields(rows: Array<[string, unknown]>): string {
  return `<dl class="ts-fields">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${val(v)}</dd>`).join('')}</dl>`;
}

function fail(message: string): Sheet {
  return { title: 'Unavailable', subtitle: '', body: '', error: message };
}

// ---------------------------------------------------------------------------

async function userSheet(env: Env, id: string): Promise<Sheet> {
  type Detail = {
    user: Row;
    hostedExcursions: Row[];
    joinedExcursions: Row[];
    media: Row[];
    reportsAgainst: Row[];
    reportsBy: Row[];
    verificationSessions: Row[];
  };
  const r = await api.get<Detail>(env, `/users/${encodeURIComponent(id)}`);
  if (!r.ok) return fail(`${r.error} (HTTP ${r.status})`);
  const u = r.data.user;

  const counts = [
    { label: 'Hosted', value: r.data.hostedExcursions.length },
    { label: 'Joined', value: r.data.joinedExcursions.length },
    { label: 'Media', value: r.data.media.length },
    { label: 'Reports against', value: r.data.reportsAgainst.length },
    { label: 'Reports filed', value: r.data.reportsBy.length },
  ];

  const body = [
    fields([
      ['ID', u.id], ['Email', u.email], ['Username', u.username], ['Name', u.name],
      ['Headline', u.headline], ['Location', u.location],
      ['Coordinates', u.latitude != null ? `${u.latitude}, ${u.longitude}` : null],
      ['Verified', u.is_verified ? 'yes' : 'no'],
      ['Ejected', u.is_ejected ? 'yes' : 'no'],
      ['Ejected at', u.ejected_at], ['Ejection reason', u.ejection_reason],
      ['Auth provider', u.auth_provider],
      ['Followers', u.followers_count], ['Following', u.following_count],
      ['Vouches', u.vouches_count],
      ['Available to connect', u.is_available_to_connect ? 'yes' : 'no'],
      ['Last seen', u.last_seen_at ? `${dateTime(String(u.last_seen_at))} (${relative(String(u.last_seen_at))})` : null],
      ['Created', dateTime(String(u.created_at))],
    ]),
    '<h4>Activity</h4>',
    bars(counts),
    r.data.verificationSessions.length
      ? `<h4>Verification</h4><table class="ts-table"><thead><tr><th>Status</th><th>Level</th><th>Started</th></tr></thead><tbody>${
          r.data.verificationSessions.map((v) =>
            `<tr><td>${val(v.status)}</td><td>${val(v.level)}</td><td>${dateTime(String(v.created_at))}</td></tr>`).join('')
        }</tbody></table>`
      : '',
    `<p class="ts-more"><a href="/users/${encodeURIComponent(String(u.id))}">Open full profile</a></p>`,
  ].join('\n');

  return {
    title: String(u.name || u.username || 'User'),
    subtitle: String(u.email || u.id),
    body,
    error: null,
  };
}

async function excursionSheet(env: Env, id: string): Promise<Sheet> {
  type Detail = { excursion: Row; participants: Row[]; reports: Row[]; albums: Row[] };
  const r = await api.get<Detail>(env, `/excursions/${encodeURIComponent(id)}`);
  if (!r.ok) return fail(`${r.error} (HTTP ${r.status})`);
  const e = r.data.excursion;

  const joined = r.data.participants.filter((p) => p.status === 'joined').length;
  const capacity = Number(e.max_pax ?? 0);

  const body = [
    fields([
      ['ID', e.id], ['Title', e.title], ['Host', e.host_name ?? e.host_id],
      ['Starts', dateTime(String(e.date))],
      ['Ends', e.end_date ? dateTime(String(e.end_date)) : null],
      ['Location', e.location_name], ['Address', e.location_address],
      ['Coordinates', e.latitude != null ? `${e.latitude}, ${e.longitude}` : null],
      ['Min pax', e.min_pax], ['Max pax', e.max_pax],
      ['Flexible dates', e.is_flexible_dates ? 'yes' : 'no'],
      ['Weather dependent', e.is_weather_dependent ? 'yes' : 'no'],
      ['Status', e.status], ['Deleted', e.is_deleted ? 'yes' : 'no'],
      ['Created', dateTime(String(e.created_at))],
      ['Updated', dateTime(String(e.updated_at))],
    ]),
    capacity > 0
      ? `<h4>Capacity</h4>${donut([
          { label: 'Joined', value: joined },
          { label: 'Unfilled', value: Math.max(0, capacity - joined), colour: '#272c37' },
        ], 132, 20)}`
      : '',
    `<h4>Participants (${r.data.participants.length})</h4>`,
    r.data.participants.length
      ? `<table class="ts-table"><thead><tr><th>Name</th><th>Status</th><th>Joined</th></tr></thead><tbody>${
          r.data.participants.map((p) =>
            `<tr><td>${val(p.name)}</td><td>${val(p.status)}</td><td>${relative(String(p.created_at))}</td></tr>`).join('')
        }</tbody></table>`
      : '<div class="empty">Nobody has joined.</div>',
    r.data.reports.length
      ? `<h4>Reports (${r.data.reports.length})</h4><table class="ts-table"><thead><tr><th>Reason</th><th>Status</th><th>When</th></tr></thead><tbody>${
          r.data.reports.map((x) =>
            `<tr><td>${val(x.reason)}</td><td>${val(x.status)}</td><td>${relative(String(x.created_at))}</td></tr>`).join('')
        }</tbody></table>`
      : '',
    `<p class="ts-more"><a href="/excursions/${encodeURIComponent(String(e.id))}">Open full excursion</a></p>`,
  ].join('\n');

  return {
    title: String(e.title || 'Excursion'),
    subtitle: `${val(e.location_name)} · ${dateTime(String(e.date))}`,
    body,
    error: null,
  };
}

async function distributionSheet(env: Env, field: string, label: string): Promise<Sheet> {
  type Dist = {
    field: string; table: string; column: string; total: number;
    values: Array<{ value: string; n: number }>;
  };
  const r = await api.get<Dist>(env, `/quality/distribution?field=${encodeURIComponent(field)}&limit=25`);
  if (!r.ok) return fail(`${r.error} (HTTP ${r.status})`);

  const rows = r.data.values.map((v) => ({ label: v.value, value: v.n }));
  const covered = rows.reduce((a, x) => a + x.value, 0);
  const total = r.data.total;

  // A donut must sum to the whole or it is lying about proportion. Showing the
  // top six alone made the centre read 645 against a stated 751 rows, so the
  // remainder is folded into an explicit "other" slice rather than dropped.
  const head = rows.slice(0, 6);
  const rest = rows.slice(6).reduce((a, x) => a + x.value, 0);
  const slices = rest > 0
    ? [...head, { label: `Other (${rows.length - 6} values)`, value: rest, colour: '#3a4150' }]
    : head;

  const body = [
    // Donut for shape, bars for the detail. A donut with 25 slices is
    // unreadable; a bar chart with 25 rows is fine.
    rows.length > 1 ? donut(slices, 150, 24) : '',
    '<h4>Every value</h4>',
    bars(rows, { showPct: true }),
    `<h4>Table</h4><table class="ts-table"><thead><tr><th>Value</th><th class="num">Rows</th><th class="num">Share</th></tr></thead><tbody>${
      rows.map((v) =>
        `<tr><td>${esc(truncate(v.label, 44))}</td><td class="num">${num(v.value)}</td><td class="num">${
          total ? ((v.value / total) * 100).toFixed(1) : '0'
        }%</td></tr>`).join('')
    }</tbody></table>`,
    covered < total
      ? `<p class="ts-more">Top ${rows.length} shown, covering ${num(covered)} of ${num(total)} rows.</p>`
      : '',
  ].join('\n');

  return {
    title: label || r.data.column,
    subtitle: `${r.data.table}.${r.data.column} · ${num(total)} rows`,
    body,
    error: null,
  };
}

// ---------------------------------------------------------------------------

export async function renderTearSheet(
  env: Env,
  type: string,
  params: URLSearchParams,
): Promise<Sheet> {
  const id = params.get('id') ?? '';
  const label = params.get('label') ?? '';

  if (type === 'user' && id) return userSheet(env, id);
  if (type === 'excursion' && id) return excursionSheet(env, id);
  if (type === 'distribution') return distributionSheet(env, params.get('field') ?? '', label);
  return fail(`Nothing to show for "${esc(type)}".`);
}
