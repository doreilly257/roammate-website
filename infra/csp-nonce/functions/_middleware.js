// Opt-in template only. Never copy into a live deployment without staged review.
// Keep in parity with public/_headers: Pages does not apply it to Functions.
const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://us-assets.i.posthog.com https://static.cloudflareinsights.com; connect-src 'self' https://us.i.posthog.com https://api.roammate.com https://cloudflareinsights.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
});

/** @param {URL} url */
function isHtmlCandidate(url) {
  const publicHost = url.hostname === 'roammate.com' || url.hostname === 'www.roammate.com'
    || url.hostname === 'roammate-cs7.pages.dev' || url.hostname.endsWith('.roammate-cs7.pages.dev')
    || url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (!publicHost || /^\/(?:api|admin|cdn-cgi|_astro|images|fonts|\.well-known)(?:\/|$)/.test(url.pathname)) return false;
  // Non-HTML extensions remain static; actual content type is checked below.
  return !/\.[^/]+$/.test(url.pathname) || /\.html$/i.test(url.pathname);
}

/**
 * @param {{ request: Request, next: (request: Request) => Promise<Response> }} context
 * @returns {Promise<Response>}
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (!['GET', 'HEAD'].includes(context.request.method) || !isHtmlCandidate(url)) {
    return context.next(context.request);
  }

  // A browser must not pair a fresh nonce header with an old/partial document.
  const requestHeaders = new Headers(context.request.headers);
  for (const name of ['If-None-Match', 'If-Modified-Since', 'If-Range', 'Range']) requestHeaders.delete(name);
  const response = await context.next(new Request(context.request, { headers: requestHeaders }));
  const headers = new Headers(response.headers);
  const upstreamPolicy = headers.get('Content-Security-Policy');
  if (upstreamPolicy !== null && upstreamPolicy !== SECURITY_HEADERS['Content-Security-Policy']) {
    // Refuse to silently discard a new restriction or a second enforced policy.
    // No passThroughOnException: a policy mismatch requires operator review.
    throw new Error('Unexpected upstream Content-Security-Policy; refusing nonce transformation');
  }
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  if (url.hostname.endsWith('.pages.dev')) headers.set('X-Robots-Tag', 'noindex, nofollow');

  const html = /^text\/html(?:\s*;|\s*$)/i.test(headers.get('Content-Type') ?? '');
  if (html && (response.status < 300 || response.status >= 400)) {
    // Request-local 256-bit CSPRNG; never stored, logged or embedded at build time.
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    headers.set('Content-Security-Policy', SECURITY_HEADERS['Content-Security-Policy'].replace(
      /script-src ([^;]+)/, `script-src $1 'nonce-${nonce}'`,
    ));
    for (const name of ['Cache-Control', 'CDN-Cache-Control', 'Cloudflare-CDN-Cache-Control']) headers.set(name, 'no-store');
    for (const name of ['ETag', 'Last-Modified']) headers.delete(name);
  }

  // No HTML rewriting: do not authorize arbitrary inline scripts. Cloudflare
  // reads the CSP nonce and attaches it to its own JSD injection downstream.
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
