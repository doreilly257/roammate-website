import { boundQuery } from './search-handoff';

export interface SearchItem {
  url: string;
  meta: { title?: string; description?: string; type?: string };
  plain_excerpt?: string;
}
interface Result { data(): Promise<SearchItem> }
type Facets = Record<string, Record<string, number>>;
export interface SearchAPI {
  options(options: { baseUrl: string; noWorker: boolean }): Promise<unknown>;
  filters(): Promise<Facets>;
  search(query: string, options: { filters: Record<string, string> }): Promise<{ results: Result[] }>;
}
export interface SearchState {
  query: string; country: string; type: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: SearchItem[]; total: number; facets: Facets; retryable: boolean;
}

class SearchReloadRequiredError extends Error {}
type PagefindModule = SearchAPI & { destroy(): Promise<void> };

interface SearchHealth { hasFailed(): boolean; reset(): void }

// Install only on /search/. Pagefind 1.5.2 swallows index/filter fetch failures,
// otherwise turning a partial index into apparently successful (empty) results.
// Observe transport health without changing requests, responses, errors or logging.
// HTTP-200 malformed chunks remain an upstream limitation: there is no public error hook.
export function observePagefindFetch(target: { fetch: typeof fetch; location: { origin: string } }): SearchHealth {
  const original = target.fetch;
  let failed = false;
  let epoch = 0;
  target.fetch = async (...args: Parameters<typeof fetch>) => {
    const requestEpoch = epoch;
    let watched = false;
    try {
      const input = args[0];
      const url = new URL(input instanceof Request ? input.url : String(input), target.location.origin);
      watched = url.origin === target.location.origin && /^\/pagefind\/(?:index\/[^/]+\.pf_index|filter\/[^/]+\.pf_filter)$/.test(url.pathname);
    } catch { /* Invalid or unrelated input is still handled by the original fetch. */ }
    try {
      const response = await original.apply(target, args);
      if (watched && requestEpoch === epoch && !response.ok) failed = true;
      return response;
    } catch (error) {
      if (watched && requestEpoch === epoch) failed = true;
      throw error;
    }
  };
  return { hasFailed: () => failed, reset: () => { failed = false; epoch++; } };
}

export function createPagefindLoader(importer: (path: string) => Promise<PagefindModule>) {
  let module: PagefindModule | undefined;
  let attempts = 0;
  return async (): Promise<SearchAPI> => {
    if (!module) {
      // Browsers cache failed module imports by URL. Bound distinct module identities;
      // only a fixed retry counter is transported, never any user input.
      if (attempts >= 4) throw new SearchReloadRequiredError('Reload to retry the search runtime');
      const path = '/pagefind/pagefind.js' + (attempts ? `?retry=${attempts}` : '');
      attempts++;
      try { module = await importer(path); }
      catch (error) {
        if (attempts >= 4) throw new SearchReloadRequiredError('Reload to retry the search runtime');
        throw error;
      }
    } else {
      // Pagefind 1.5.2 retains initError and rejected loaded_fragments promises.
      // Its public destroy API clears the singleton; the controller reapplies options.
      await module.destroy();
    }
    return module;
  };
}

// The build authorizes articles; this second boundary rejects unsafe URL shapes.
export function safeResultPath(value: string, origin: string): string | null {
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || url.search || url.hash || url.username || url.password) return null;
    if (!/^\/(?:guides|blog)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(url.pathname)) return null;
    if (value !== url.pathname && value !== `${origin}${url.pathname}`) return null;
    return url.pathname;
  } catch { return null; }
}

export function createSearchController(loader: () => Promise<SearchAPI>, render: (state: SearchState) => void, health?: SearchHealth) {
  let state: SearchState = { query: '', country: '', type: '', status: 'idle', items: [], total: 0, facets: {}, retryable: true };
  let runtime: Promise<SearchAPI> | undefined;
  let generation = 0;
  let results: Result[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const emit = (patch: Partial<SearchState>) => { state = { ...state, ...patch }; render(state); };
  const assertHealthy = () => { if (health?.hasFailed()) throw new Error('Search index unavailable'); };
  function load() {
    if (!runtime) runtime = loader().then(async api => {
      await api.options({ baseUrl: '/', noWorker: true });
      return api;
    }).catch(error => { runtime = undefined; throw error; });
    return runtime;
  }
  async function hydrate(token: number, start: number) {
    const items = await Promise.all(results.slice(start, start + 10).map(result => result.data()));
    if (token === generation) emit({ items: [...state.items, ...items], status: 'ready' });
  }
  async function search(query: string, country = '', type = '') {
    clearTimeout(timer);
    const token = ++generation;
    results = [];
    query = boundQuery(query);
    emit({ query, country, type, items: [], total: 0, retryable: true, status: query ? 'loading' : 'idle' });
    if (!query) return;
    try {
      assertHealthy();
      const api = await load();
      const facets = await api.filters();
      if (token !== generation) return;
      assertHealthy();
      const filters: Record<string, string> = {};
      if (country) filters.country = country;
      if (type) filters.type = type;
      const response = await api.search(query, { filters });
      if (token !== generation) return;
      assertHealthy();
      results = response.results;
      emit({ facets, total: results.length });
      await hydrate(token, 0);
    } catch (error) { if (token === generation) emit({ status: 'error', retryable: !(error instanceof SearchReloadRequiredError) }); }
  }
  return {
    search,
    schedule(query: string, country = '', type = '') {
      clearTimeout(timer);
      ++generation; // Invalidate in-flight work at input time, not after the debounce.
      emit({ query: boundQuery(query), country, type, status: query.trim() ? 'loading' : 'idle', items: [], total: 0 });
      timer = setTimeout(() => { void search(query, country, type); }, 200);
    },
    reset() { return search(''); },
    retry() { runtime = undefined; health?.reset(); return search(state.query, state.country, state.type); },
    async more() {
      if (state.status !== 'ready' || state.items.length >= results.length) return;
      const token = generation;
      emit({ status: 'loading' });
      try { await hydrate(token, state.items.length); }
      catch { if (token === generation) emit({ status: 'error' }); }
    },
  };
}
