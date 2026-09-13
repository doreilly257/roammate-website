/** Local prototype only; never use request data as the opt-in. */
export function localMediaEnabled(development: boolean, optIn: unknown): boolean {
  return development && optIn === 'true';
}

export type ReviewMedia = { kind: 'image' | 'video'; url: string };
export type ReviewDescription = { label: string; body: string; image?: string; media?: ReviewMedia[] };

export function validMediaURL(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'media.roammate.com'
      && !url.username && !url.password && !url.port ? url.href : null;
  } catch { return null; }
}

/** Metadata describes persisted kind, not MIME attestation or human review. */
export function describeLocalTarget(payload: { targetType: string; target: unknown }): ReviewDescription | null {
  const target = payload.target;
  if (!target || typeof target !== 'object' || Array.isArray(target)) return null;
  const t = target as Record<string, unknown>;
  const text = (key: string) => typeof t[key] === 'string' ? t[key] as string : '';
  const media: ReviewMedia[] = [];
  const attach = (kind: ReviewMedia['kind'], key: string, required = false): boolean => {
    if (t[key] == null || t[key] === '') return !required;
    const url = validMediaURL(t[key]);
    if (!url) return false;
    media.push({ kind, url });
    return true;
  };
  if (payload.targetType === 'album_media') {
    if (t.type !== 'photo' && t.type !== 'video') return null;
    if (typeof t.album_id !== 'string' || !t.album_id) return null;
    if (!attach(t.type === 'photo' ? 'image' : 'video', 'url', true)) return null;
    return { label: 'Reported media', body: text('caption') || '(no caption)', media };
  }
  if (payload.targetType === 'message') {
    if (t.is_deleted != null && t.is_deleted !== 0 && t.is_deleted !== false) return null;
    if (t.content != null && typeof t.content !== 'string') return null;
    if (!attach('image', 'image_url') || !attach('video', 'video_url')) return null;
    if (!text('content').trim() && !media.length) return null;
    return { label: 'Reported message', body: text('content') || '(no text — media only)', media };
  }
  if (payload.targetType === 'excursion') {
    if (!attach('image', 'cover_image_url')) return null;
    return { label: 'Reported excursion', body: `${text('title')}\n\n${text('description')}`.trim(), media };
  }
  if (payload.targetType === 'user') {
    if (!attach('image', 'profile_image_url')) return null;
    return { label: 'Reported profile', body: ['name', 'username', 'headline', 'location', 'bio'].map(text).filter(Boolean).join('\n'), media };
  }
  return null;
}

type MediaState = { kind: 'image' | 'video'; error?: boolean; complete?: boolean; width: number; readyState?: number; currentTime?: number; muted?: boolean; volume?: number };
/** Availability only: the operator must still review all content, including audio. */
export function originalReady(state: MediaState): boolean {
  if (state.error || state.width <= 0) return false;
  return state.kind === 'image' ? state.complete === true
    : (state.readyState ?? 0) >= 2 && (state.currentTime ?? 0) > 0 && state.muted === false && (state.volume ?? 0) > 0;
}
