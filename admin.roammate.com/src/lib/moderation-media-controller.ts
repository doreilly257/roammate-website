import { originalReady } from './moderation-media';

/** UX safeguard only, not proof of human review or server authorization. */
export function bindMediaReview(root: HTMLElement): void {
  const originals = [...root.querySelectorAll<HTMLImageElement | HTMLVideoElement>('[data-review-original]')];
  const reviewed = root.querySelector<HTMLInputElement>('[name="reviewed"]');
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('button[name="action"]')];
  const status = root.querySelector<HTMLElement>('[data-media-status]');
  const form = root.querySelector<HTMLFormElement>('form');
  if (!originals.length || !reviewed || !status || !form) return;
  const invalid = new Set<Element>();
  const failed = new Set<Element>();
  const playingFrom = new Map<Element, number>();
  const progressed = new Set<Element>();
  const ready = (el: HTMLImageElement | HTMLVideoElement) => {
    if (invalid.has(el) || failed.has(el)) return false;
    if (el.tagName === 'IMG') {
      const image = el as HTMLImageElement;
      return originalReady({ kind: 'image', complete: image.complete, width: image.naturalWidth });
    }
    const video = el as HTMLVideoElement;
    return progressed.has(el) && !video.seeking && originalReady({ kind: 'video', error: !!video.error, width: video.videoWidth, readyState: video.readyState, currentTime: video.currentTime, muted: video.muted, volume: video.volume });
  };
  const update = () => {
    const available = originals.every(ready);
    if (!available) reviewed.checked = false;
    reviewed.disabled = !available;
    for (const button of buttons) button.disabled = !available || !reviewed.checked || button.dataset.unavailable === 'true';
    status.textContent = failed.size
      ? 'Original media failed or is unavailable. No decision is available. Reload to retry.'
      : available
        ? 'Originals are available. Review all content, including video and audio, before confirming. If audio cannot be reviewed, do not confirm.'
        : 'Waiting for every original. Load images and play videos with audible sound. Unsupported playback or unavailable audio prevents full review.';
  };
  // Never restore acknowledgement from a previous page visit.
  reviewed.checked = false;
  for (const el of originals) {
    for (const event of ['load', 'loadedmetadata', 'canplay', 'timeupdate', 'playing', 'volumechange']) {
      el.addEventListener(event, () => {
        if (event === 'load') invalid.delete(el);
        if (el.tagName === 'VIDEO') {
          const video = el as HTMLVideoElement;
          if (event === 'playing' && !video.paused && !video.seeking) playingFrom.set(el, video.currentTime);
          if (event === 'timeupdate' && !video.paused && !video.seeking
              && playingFrom.has(el) && video.currentTime > playingFrom.get(el)!) {
            progressed.add(el);
            invalid.delete(el);
          }
        }
        update();
      });
    }
    for (const event of ['error', 'emptied', 'loadstart', 'seeking']) {
      el.addEventListener(event, () => { invalid.add(el); playingFrom.delete(el); progressed.delete(el); if (event === 'error') failed.add(el); reviewed.checked = false; update(); });
    }
  }
  reviewed.addEventListener('change', update);
  root.ownerDocument.defaultView?.addEventListener('pageshow', () => { reviewed.checked = false; update(); });
  form.addEventListener('submit', (event) => { if (!originals.every(ready) || !reviewed.checked) event.preventDefault(); });
  update();
}
