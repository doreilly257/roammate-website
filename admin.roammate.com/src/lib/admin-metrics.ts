/** Conservative presentation for additive admin aggregates, not a health verdict. */
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
export interface Metric { value: number | null; text: string; note: string }
const missing = 'not returned by this API response';
const unavailable = (note = 'invalid or unavailable metric'): Metric => ({ value: null, text: 'Unavailable', note });
export function countMetric(value: unknown): Metric {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? { value, text: value.toLocaleString('en-US'), note: '' }
    : unavailable(value === undefined ? missing : undefined);
}

export function albumMetrics(content: unknown) {
  const source = record(content);
  let withMedia = countMetric(source.albumsWithMedia);
  let total = countMetric(source.albums);
  let warning = '';
  if (withMedia.value !== null && total.value !== null && withMedia.value > total.value) {
    warning = 'Album counts are inconsistent in this response; the album pair is unavailable.';
    withMedia = unavailable('inconsistent album counts'); total = unavailable('inconsistent album counts');
  }
  return { warning, cards: [
    { label: 'Albums with media', help: 'Albums containing stored media rows', metric: withMedia },
    { label: 'Total albums', help: 'Includes empty album scaffolds', metric: total },
    { label: 'Media items', help: 'Stored media rows', metric: countMetric(source.media) },
  ] };
}

export const WEBHOOK_TABLE = 'verification_webhook_events';
export const WEBHOOK_SOURCES = ['verification_webhook_received', 'verification_webhook_processed'];
const COLUMNS = ['state', 'received_at', 'processed_at', 'attempt_count'];
function unique(entries: unknown, key: string, expected: string) {
  if (!Array.isArray(entries)) return { item: undefined, note: missing };
  const matches = entries.map(record).filter(item => item[key] === expected);
  return matches.length === 1 ? { item: matches[0], note: '' } : { item: undefined, note: matches.length ? 'duplicate or malformed entries' : missing };
}

function timestamp(entry: ReturnType<typeof unique>, now: number) {
  if (!entry.item) return { text: 'Unavailable', note: entry.note };
  const value = entry.item.latest;
  // Accept UTC ISO clocks only; round-trip catches calendar rollover (e.g. Feb 30).
  const validShape = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value);
  const date = validShape ? new Date(value) : new Date(NaN);
  const expected = validShape ? value.replace(/(?:\.(\d{1,3}))?Z$/, (_, fraction: string | undefined) => `.${(fraction ?? '').padEnd(3, '0')}Z`) : '';
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== expected) return { text: 'Unavailable', note: 'no reliable recorded timestamp; empty data and failed probes are indistinguishable' };
  const age = now - date.getTime();
  if (age < 0) return { text: date.toISOString(), note: 'Future timestamp — check clock or recorded-time anomaly' };
  const minutes = Math.floor(age / 60_000);
  const amount = minutes < 60 ? minutes : minutes < 1440 ? Math.floor(minutes / 60) : Math.floor(minutes / 1440);
  const unit = minutes < 60 ? 'minute' : minutes < 1440 ? 'hour' : 'day';
  return { text: date.toISOString(), note: `${amount} ${unit}${amount === 1 ? '' : 's'} ago (UTC)` };
}

function aggregate(value: unknown): Metric {
  const metric = countMetric(value);
  if (metric.value === 0) return unavailable('zero not distinguishable from probe failure');
  return metric.value === null ? metric : { ...metric, note: 'Reported aggregate' };
}

export function webhookEvidence(tables: unknown, profiles: unknown, sources: unknown, now = Date.now()) {
  const table = unique(tables, 'table', WEBHOOK_TABLE);
  const profile = unique(profiles, 'table', WEBHOOK_TABLE);
  const profileValid = profile.item && countMetric(profile.item.rows).value !== null && Array.isArray(profile.item.columns);
  const columns = COLUMNS.map(column => {
    const match = unique(profile.item?.columns, 'column', column);
    const metric = (field: string) => profileValid && match.item ? aggregate(match.item[field]) : unavailable(profile.note || match.note || 'invalid or unavailable profile');
    return { column, filled: metric('filled'), blank: metric('blank'), ...(column === 'state' ? { distinct: metric('distinct') } : {}) };
  });
  return {
    rows: table.item ? countMetric(table.item.rows) : unavailable(table.note), columns,
    received: timestamp(unique(sources, 'id', WEBHOOK_SOURCES[0]), now),
    processed: timestamp(unique(sources, 'id', WEBHOOK_SOURCES[1]), now),
  };
}

const ERROR_MESSAGES = {
  overview: 'Could not load overview data', timeseries: 'Could not load timeseries data', activity: 'Could not load activity data',
  tables: 'Could not load table count data', columns: 'Could not load column profile data', integrity: 'Could not load integrity data',
  anomalies: 'Could not load anomaly data', freshness: 'Could not load webhook freshness data',
};
export function safeRequestError(result: unknown, context: keyof typeof ERROR_MESSAGES): string | null {
  const source = record(result);
  if (source.ok === true) return null;
  const status = source.status;
  return ERROR_MESSAGES[context] + (typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? ` (HTTP ${status})` : ' — unavailable');
}
