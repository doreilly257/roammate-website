const QUERY_KEY = 'roammate.search.query';
export const boundQuery = (query: string) => query.trim().slice(0, 200);

export function handoffQuery(query: string, storage: () => Pick<Storage, 'setItem' | 'removeItem'>, navigate: (path: string) => void) {
  try {
    const target = storage();
    target.removeItem(QUERY_KEY);
    const bounded = boundQuery(query);
    if (bounded) target.setItem(QUERY_KEY, bounded);
  } catch { /* Storage denial falls back to an empty search page. */ }
  navigate('/search/');
}

export function consumeQuery(storage: () => Pick<Storage, 'getItem' | 'removeItem'>): string {
  try {
    const target = storage();
    const query = target.getItem(QUERY_KEY);
    target.removeItem(QUERY_KEY);
    return boundQuery(query ?? '');
  } catch { return ''; }
}
