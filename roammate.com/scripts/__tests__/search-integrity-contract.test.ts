import { describe, expect, it } from 'vitest';
import { INTEGRITY_MAX_BYTES, INTEGRITY_MAX_ENTRIES, INTEGRITY_MAX_PATH_LENGTH, INTEGRITY_VERSION, PAGEFIND_VERSION, isIntegrityAssetPath, validateIntegrityManifest } from '../../src/lib/search-integrity';

const digest = `sha256-${'A'.repeat(43)}=`;
const index = '/pagefind/index/en_a.pf_index';
const filter = '/pagefind/filter/en_b.pf_filter';
const valid = () => ({ version: 1, pagefindVersion: '1.5.2', assets: { [index]: digest, [filter]: digest } });
describe('shared integrity contract', () => {
  it('pins the schema, runtime and shared bounds', () => {
    expect([INTEGRITY_VERSION, PAGEFIND_VERSION, INTEGRITY_MAX_ENTRIES, INTEGRITY_MAX_BYTES, INTEGRITY_MAX_PATH_LENGTH]).toEqual([1, '1.5.2', 2048, 262144, 160]);
    const map = validateIntegrityManifest(valid());
    expect(map).toBeInstanceOf(Map);
    expect(map.get(index)).toBe(digest);
    expect(map.get('toString')).toBeUndefined();
  });
  it.each([null, [], 1, {}, { ...valid(), extra: true }, { ...valid(), version: 2 }, { ...valid(), pagefindVersion: '1.5.3' }, { ...valid(), assets: [] }, { ...valid(), assets: null }, { ...valid(), assets: {} }, { ...valid(), assets: { [index]: digest } }, { ...valid(), assets: { [filter]: digest } }])('rejects invalid schema %j', value => {
    expect(() => validateIntegrityManifest(value)).toThrow();
  });
  it.each(['/pagefind/index/a.pf_index?x', '/pagefind/index/../a.pf_index', '/pagefind/index/a%20.pf_index', '/pagefind/index/a.pf_filter', '/pagefind/filter/a.pf_index', '/pagefind/index/a/b.pf_index', '/pagefind/index/é.pf_index', '/pagefind/index/a\\b.pf_index', '/pagefind/index/.pf_index', '//pagefind/index/a.pf_index', '/pagefind/index/aXpf_index', '/pagefind/index/a.pf_index\n', '/pagefind/index/a.pf_index\r', '/pagefind/index/a.pf_index\u2028', '/pagefind/index/a.pf_index\u2029'])('rejects noncanonical path %s', path => {
    expect(isIntegrityAssetPath(path)).toBe(false);
    expect(() => validateIntegrityManifest({ ...valid(), assets: { ...valid().assets, [path]: digest } })).toThrow();
  });
  it('accepts exactly 160 ASCII path characters, not 161', () => {
    const path = '/pagefind/index/' + 'a'.repeat(135) + '.pf_index';
    expect(path.length).toBe(160);
    expect(isIntegrityAssetPath(path)).toBe(true);
    expect(isIntegrityAssetPath(path.replace('/index/', '/index/a'))).toBe(false);
  });
  it.each([null, 1, '', digest + ' ', ' ' + digest, digest + '\n', digest + ' ' + digest, digest.replace('sha256-', 'sha384-'), `sha256-${'A'.repeat(42)}B=`, `sha256-${'A'.repeat(43)}`, `sha256-${'A'.repeat(42)}_=`])('rejects noncanonical digest %j', hash => {
    expect(() => validateIntegrityManifest({ ...valid(), assets: { [index]: hash, [filter]: digest } })).toThrow();
  });
  it('enforces exact entry-count boundary', () => {
    const assets = { [filter]: digest, ...Object.fromEntries(Array.from({ length: 2047 }, (_, i) => [`/pagefind/index/en_${i}.pf_index`, digest])) };
    expect(validateIntegrityManifest({ ...valid(), assets }).size).toBe(2048);
    expect(() => validateIntegrityManifest({ ...valid(), assets: { ...assets, '/pagefind/index/overflow.pf_index': digest } })).toThrow();
  });
  it('rejects prototype-bearing objects rather than inherited schema entries', () => {
    expect(() => validateIntegrityManifest(Object.create(valid()))).toThrow();
    expect(() => validateIntegrityManifest({ ...valid(), assets: Object.create(valid().assets) })).toThrow();
  });
});
