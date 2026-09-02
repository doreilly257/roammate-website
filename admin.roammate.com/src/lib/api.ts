/**
 * Server-side client for the admin console API.
 *
 * Runs only in the Pages Function. The admin key is read from the runtime env
 * and attached here; it is never serialised into a page, and no browser code in
 * this project talks to the API directly.
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

type Env = { API_BASE_URL: string; ADMIN_API_KEY: string };

async function request<T>(
  env: Env,
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<ApiResult<T>> {
  const url = `${env.API_BASE_URL.replace(/\/$/, '')}/v1/admin${path}`;
  const headers: Record<string, string> = { 'X-Admin-Key': env.ADMIN_API_KEY };
  let body: BodyInit | undefined;
  if (init?.json !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(init.json);
  }

  try {
    const res = await fetch(url, { ...init, headers: { ...headers, ...init?.headers }, body });
    const text = await res.text();
    if (!res.ok) {
      // Surface the API's own message when it sent one; a bare status tells the
      // operator nothing about whether it was the key, the route or the data.
      let detail = text.slice(0, 300);
      try {
        const parsed = JSON.parse(text) as { error?: string };
        if (parsed.error) detail = parsed.error;
      } catch {
        /* not json; keep the raw text */
      }
      return { ok: false, error: detail || res.statusText, status: res.status };
    }
    return { ok: true, data: JSON.parse(text) as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error', status: 0 };
  }
}

export const api = {
  get: <T>(env: Env, path: string) => request<T>(env, path),
  post: <T>(env: Env, path: string, json?: unknown) =>
    request<T>(env, path, { method: 'POST', json: json ?? {} }),
  put: <T>(env: Env, path: string, json?: unknown) =>
    request<T>(env, path, { method: 'PUT', json: json ?? {} }),
};

/** Mirrors FeatureFlags in api/src/services/feature-flags.ts. Kept as an explicit
 *  list rather than Record<string, boolean> so a flag added there shows up here
 *  as a type error rather than silently missing from the console. */
export type FeatureFlags = {
  proximity_enabled: boolean;
  ai_concierge_enabled: boolean;
  trip_memory_enabled: boolean;
  tonight_push_enabled: boolean;
  notifications_canonical_shadow: boolean;
  notifications_canonical_active: boolean;
  matchmaking_enabled: boolean;
  verification_gate_enabled: boolean;
};

// --- Response shapes -------------------------------------------------------

export type Overview = {
  generatedAt: string;
  users: { total: number; verified: number; ejected: number; new7d: number; new30d: number; active7d: number };
  excursions: { total: number; upcoming: number; deleted: number; new7d: number; participants: number };
  content: { albums: number; media: number; messages7d: number };
  queues: { reportsOpen: number; sosOpen: number; verificationPending: number };
};

export type TimeseriesPoint = {
  day: string;
  signups: number;
  excursions: number;
  joins: number;
  messages: number;
  reports: number;
};

export type ActivityEvent = {
  kind: string;
  entity_id: string;
  actor_id: string | null;
  actor_name: string | null;
  detail: string | null;
  at: string;
};

export type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  headline: string | null;
  location: string | null;
  profile_image_url: string | null;
  is_verified: number;
  is_ejected: number;
  ejected_at: string | null;
  ejection_reason: string | null;
  followers_count: number;
  vouches_count: number;
  auth_provider: string | null;
  last_seen_at: string | null;
  created_at: string;
};

export type AdminExcursion = {
  id: string;
  title: string;
  date: string | null;
  end_date: string | null;
  location_name: string | null;
  status: string | null;
  is_deleted: number;
  min_pax: number | null;
  max_pax: number | null;
  cover_image_url: string | null;
  created_at: string;
  host_id: string | null;
  host_name: string | null;
  host_verified: number | null;
  participant_count: number;
};

export type AdminMedia = {
  id: string;
  url: string;
  thumbnail_url: string | null;
  type: string | null;
  caption: string | null;
  location_name: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string | null;
  user_name: string | null;
  is_verified: number | null;
  album_id: string | null;
  album_name: string | null;
  is_public: number | null;
};

export type AdminReport = {
  id: string;
  reporter_id: string | null;
  reporter_name: string | null;
  target_type: string;
  target_id: string;
  target_user_id: string | null;
  target_user_name: string | null;
  target_ejected: number | null;
  reason: string;
  details: string | null;
  status: string;
  action_due_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
};

export type ModerationAction = {
  id: string;
  report_id: string | null;
  action_type: string;
  actor_id: string | null;
  target_user_id: string | null;
  target_user_name: string | null;
  target_type: string | null;
  target_id: string | null;
  notes: string | null;
  created_at: string;
};
