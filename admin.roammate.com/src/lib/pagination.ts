/** Reject non-finite, fractional and unsafe offsets before sending them to D1. */
export function parseOffset(value: string | null): number {
  const offset = Number(value ?? 0);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

/** Recover bookmarks that became empty after records were removed or filtered. */
export function paginationRedirect(url: URL, total: number, limit: number): string | null {
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(limit) || limit <= 0) return null;
  const offset = parseOffset(url.searchParams.get('offset'));
  if (offset === 0 || offset < total) return null;
  const lastOffset = total === 0 ? 0 : Math.floor((total - 1) / limit) * limit;
  const params = new URLSearchParams(url.searchParams);
  if (lastOffset === 0) params.delete('offset');
  else params.set('offset', String(lastOffset));
  return `${url.pathname}${params.size ? `?${params}` : ''}`;
}
