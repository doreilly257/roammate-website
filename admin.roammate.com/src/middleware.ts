/**
 * Cloudflare Access enforcement.
 *
 * WHY VERIFY AT ALL, when Access already sits in front of the hostname: because
 * Access protects the *hostname*, and a Pages project is also reachable at its
 * <project>.pages.dev address, which the Access policy does not cover. Trusting
 * the edge without checking the token means anyone who guesses the pages.dev
 * name walks straight into an admin console that can eject users. So the token
 * is verified here, on every request, and the app fails CLOSED when it cannot.
 *
 * The token arrives as the Cf-Access-Jwt-Assertion header (or the CF_Authorization
 * cookie). It is an RS256 JWT signed by the team's Access keys. Verifying it
 * means: signature against the team JWKS, `aud` contains this application's AUD
 * tag, `iss` is the team domain, and it has not expired. Checking the signature
 * but not the `aud` would accept a token minted for a DIFFERENT Access
 * application in the same account, which is the classic mistake here.
 */
import { defineMiddleware } from 'astro:middleware';

type Jwk = JsonWebKey & { kid?: string };
type Jwks = { keys: Jwk[] };

/** JWKS cached per isolate. Access rotates keys, so this expires rather than
 *  living forever; a cache miss is one sub-request. */
let jwksCache: { domain: string; fetchedAt: number; jwks: Jwks } | null = null;
const JWKS_TTL_MS = 15 * 60 * 1000;

async function getJwks(teamDomain: string): Promise<Jwks> {
  const fresh = jwksCache && jwksCache.domain === teamDomain && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS;
  if (fresh && jwksCache) return jwksCache.jwks;

  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Access certs fetch failed: ${res.status}`);
  const jwks = (await res.json()) as Jwks;
  jwksCache = { domain: teamDomain, fetchedAt: Date.now(), jwks };
  return jwks;
}

// Returns Uint8Array<ArrayBuffer> rather than the default Uint8Array<ArrayBufferLike>:
// crypto.subtle.verify's BufferSource will not accept a possibly-shared buffer.
function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment)));
}

type AccessClaims = { email?: string; aud?: string | string[]; iss?: string; exp?: number };

async function verifyAccessJwt(
  token: string,
  teamDomain: string,
  expectedAud: string,
): Promise<AccessClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { kid?: string; alg?: string };
  let claims: AccessClaims;
  try {
    header = decodeSegment(headerB64) as { kid?: string; alg?: string };
    claims = decodeSegment(payloadB64) as AccessClaims;
  } catch {
    return null;
  }
  // Pin the algorithm. Accepting whatever `alg` says is how "alg: none" and
  // RSA-key-as-HMAC-secret attacks work.
  if (header.alg !== 'RS256' || !header.kid) return null;

  const jwks = await getJwks(teamDomain);
  const jwk = jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const signed = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToBytes(signatureB64);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signed);
  if (!valid) return null;

  // Claims are only meaningful once the signature holds.
  if (claims.iss !== `https://${teamDomain}`) return null;
  const auds = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
  if (!auds.includes(expectedAud)) return null;
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) return null;

  return claims;
}

function deny(message: string, status: number): Response {
  // Deliberately plain and non-specific to the caller; the detail goes to logs.
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Not available</title>` +
      `<body style="font:14px system-ui;padding:3rem;max-width:34rem;margin:0 auto">` +
      `<h1 style="font-size:1.1rem">${message}</h1>` +
      `<p style="color:#666">This console is restricted to roammate operators.</p></body>`,
    {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // The project is reachable at roammate-admin.pages.dev, a public
        // hostname. Denial pages carry no data, but an admin console should not
        // appear in an index at all.
        'x-robots-tag': 'noindex, nofollow',
        'cache-control': 'no-store',
      },
    },
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const env = context.locals.runtime?.env;

  if (!env?.API_BASE_URL || !env?.ADMIN_API_KEY) {
    console.error('admin: API_BASE_URL or ADMIN_API_KEY is not configured');
    return deny('Console is not configured.', 503);
  }

  if (env.DEV_BYPASS_ACCESS === '1') {
    context.locals.operator = 'dev@localhost';
    return next();
  }

  const { ACCESS_TEAM_DOMAIN, ACCESS_AUD } = env;
  if (!ACCESS_TEAM_DOMAIN || !ACCESS_AUD) {
    // Fail closed. An unconfigured Access check must never mean "allow".
    console.error('admin: ACCESS_TEAM_DOMAIN or ACCESS_AUD is not configured; denying all requests');
    return deny('Console is not configured.', 503);
  }

  const token =
    context.request.headers.get('Cf-Access-Jwt-Assertion') ||
    context.cookies.get('CF_Authorization')?.value;
  if (!token) return deny('Not signed in.', 401);

  let claims: AccessClaims | null = null;
  try {
    claims = await verifyAccessJwt(token, ACCESS_TEAM_DOMAIN, ACCESS_AUD);
  } catch (err) {
    console.error('admin: Access verification error', err);
    return deny('Could not verify your session.', 503);
  }
  if (!claims) return deny('Not authorised.', 403);

  context.locals.operator = claims.email || 'unknown';
  return next();
});
