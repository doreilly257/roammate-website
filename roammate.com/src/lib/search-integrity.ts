/** Shared, browser-safe contract for the build-generated trusted-origin manifest. */
export const INTEGRITY_VERSION = 1;
export const PAGEFIND_VERSION = '1.5.2';
export const INTEGRITY_MAX_ENTRIES = 2048;
export const INTEGRITY_MAX_BYTES = 262144;
export const INTEGRITY_MAX_PATH_LENGTH = 160;
export const INTEGRITY_MANIFEST_PATH = '/pagefind/integrity.json';

export function isIntegrityAssetPath(path: unknown): path is string {
  return typeof path === 'string' && path.length <= INTEGRITY_MAX_PATH_LENGTH &&
    /^\/pagefind\/(?:index\/[A-Za-z0-9_-]+\.pf_index|filter\/[A-Za-z0-9_-]+\.pf_filter)(?![\s\S])/.test(path);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/** Validate parsed JSON only; the transport separately bounds actual encoded bytes. */
export function validateIntegrityManifest(value: unknown): Map<string, string> {
  if (!isPlainObject(value) || Object.keys(value).sort().join(',') !== 'assets,pagefindVersion,version' ||
      value.version !== INTEGRITY_VERSION || value.pagefindVersion !== PAGEFIND_VERSION || !isPlainObject(value.assets)) {
    throw new Error('Invalid Pagefind integrity manifest');
  }
  const entries = Object.entries(value.assets);
  if (entries.length > INTEGRITY_MAX_ENTRIES) throw new Error('Too many Pagefind integrity assets');
  const assets = new Map<string, string>();
  let index = false;
  let filter = false;
  for (const [path, digest] of entries) {
    // SHA256 has 32 bytes: the last base64 sextet has two zero padding bits.
    if (!isIntegrityAssetPath(path) || typeof digest !== 'string' || digest.length !== 51 ||
        !/^sha256-[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/.test(digest)) {
      throw new Error('Invalid Pagefind integrity asset');
    }
    index ||= path.startsWith('/pagefind/index/');
    filter ||= path.startsWith('/pagefind/filter/');
    assets.set(path, digest);
  }
  if (!index || !filter) throw new Error('Missing Pagefind index or filter chunks');
  return assets;
}
