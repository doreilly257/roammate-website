import { afterEach, describe, expect, it, vi } from 'vitest';
import { observePagefindFetch } from '../../src/lib/search-client';
import { INTEGRITY_MAX_BYTES } from '../../src/lib/search-integrity';

const origin = 'https://preview.test';
const index = '/pagefind/index/en_a.pf_index';
const filter = '/pagefind/filter/en_b.pf_filter';
const digest = `sha256-${'A'.repeat(43)}=`;
const manifest = () => ({ version: 1, pagefindVersion: '1.5.2', assets: { [index]: digest, [filter]: digest } });
const json = () => new Response(JSON.stringify(manifest()));
function setup(load: () => Promise<Response> = async () => json(), chunk: typeof fetch = async () => new Response('chunk')) {
  const original = vi.fn<typeof fetch>(async (...args) => args[0] === '/pagefind/integrity.json' ? load() : chunk(...args));
  const target = { fetch: original as typeof fetch, location: { origin } };
  const health = observePagefindFetch(target);
  return { target, health, original };
}
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; }
afterEach(() => vi.unstubAllGlobals());

describe('Pagefind integrity transport', () => {
  it('loads a fixed manifest lazily once and returns original responses without duplicate downloads', async () => {
    const pending = deferred<Response>(); const response = new Response('chunk');
    const x = setup(() => pending.promise, async () => response);
    expect(x.original).not.toHaveBeenCalled();
    const a = x.target.fetch(index); const b = x.target.fetch(filter);
    expect(x.original).toHaveBeenCalledTimes(1);
    expect(x.original).toHaveBeenCalledWith('/pagefind/integrity.json', { cache:'no-store', redirect:'error' });
    pending.resolve(json());
    expect(await a).toBe(response); expect(await b).toBe(response);
    expect(x.original).toHaveBeenCalledTimes(3);
    expect(x.original).toHaveBeenCalledWith(index, { integrity:digest, redirect:'error' });
  });
  it('preserves exact unrelated and cross-origin arguments without manifest loading', async () => {
    const x=setup(); const init={cache:'no-cache' as const};
    for (const input of ['/api/test', 'https://other.test'+index, '/pagefind/fragment/a.pf_fragment', '/guides'+index]) {
      await x.target.fetch(input,init); expect(x.original.mock.calls.at(-1)).toEqual([input,init]);
      expect(x.original.mock.calls.at(-1)?.[1]).toBe(init);
    }
    await x.target.fetch('/api/test'); expect(x.original.mock.calls.at(-1)).toEqual(['/api/test']);
    expect(x.original).toHaveBeenCalledTimes(5); expect(x.health.hasFailed()).toBe(false);
  });
  it('maps string, URL, and Request query/hash paths exactly without forwarding query to manifest', async () => {
    const x=setup();
    for (const input of [index+'?asset=1#part', new URL(origin+index), new Request(origin+filter)]) {
      await x.target.fetch(input); expect(x.original.mock.calls.at(-1)?.[0]).toBe(input);
      expect(x.original.mock.calls.at(-1)?.[1]).toEqual({integrity:digest,redirect:'error'});
    }
    expect(x.original.mock.calls[0][0]).toBe('/pagefind/integrity.json');
  });
  it('preserves Request inheritance and caller overrides except redirect and Retry cache', async () => {
    const x=setup(); const abort=new AbortController();
    const request=new Request(origin+index,{method:'POST',body:'payload',headers:{inherited:'yes'},credentials:'include',signal:abort.signal,cache:'force-cache',integrity:digest});
    await x.target.fetch(request);
    expect(request.bodyUsed).toBe(false);
    let effective=new Request(request,x.original.mock.calls.at(-1)?.[1]);
    expect(effective.method).toBe('POST'); expect(effective.headers.get('inherited')).toBe('yes');
    expect(effective.credentials).toBe('include'); expect(effective.cache).toBe('force-cache');
    abort.abort(); expect(effective.signal.aborted).toBe(true);
    const init:RequestInit={headers:{override:'yes'},method:'PUT',credentials:'omit',cache:'no-cache',redirect:'follow',integrity:''};
    const copy={...init}; const other=new Request(origin+index,{headers:{inherited:'yes'},cache:'force-cache'});
    await x.target.fetch(other,init); effective=new Request(other,x.original.mock.calls.at(-1)?.[1]);
    expect(init).toEqual(copy); expect(effective.headers.get('inherited')).toBeNull(); expect(effective.headers.get('override')).toBe('yes');
    expect(effective.method).toBe('PUT'); expect(effective.credentials).toBe('omit'); expect(effective.cache).toBe('no-cache'); expect(effective.redirect).toBe('error');
    x.health.reset(); await x.target.fetch(other,init);
    expect(x.original.mock.calls.at(-1)?.[1]).toEqual({...init,integrity:digest,redirect:'error',cache:'reload'});
  });
  it('rejects conflicting effective integrity but permits matching or explicitly empty integrity', async () => {
    const x=setup(); const conflicting=`sha256-${'B'.repeat(42)}A=`;
    await expect(x.target.fetch(index,{integrity:conflicting})).rejects.toThrow();
    await expect(x.target.fetch(new Request(origin+index,{integrity:conflicting}))).rejects.toThrow();
    expect(x.original).toHaveBeenCalledTimes(1);
    await x.target.fetch(new Request(origin+index,{integrity:conflicting}),{integrity:''});
    await x.target.fetch(index,{integrity:digest}); expect(x.health.hasFailed()).toBe(true);
  });
  it.each(['/pagefind/index/missing.pf_index','/pagefind/index/en.a.pf_index','/pagefind/filter/%20.pf_filter','/pagefind/index/'+'x'.repeat(161)+'.pf_index'])('fails closed for watched unknown/invalid path %s', async path => {
    const x=setup(); await expect(x.target.fetch(path)).rejects.toThrow(); expect(x.health.hasFailed()).toBe(true); expect(x.original).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['invalid JSON', () => new Response('{')], ['invalid UTF8', () => new Response(new Uint8Array([0xff]))],
    ['schema', () => new Response(JSON.stringify({...manifest(), extra:true}))],
    ['version', () => new Response(JSON.stringify({...manifest(), version:2}))],
    ['runtime', () => new Response(JSON.stringify({...manifest(), pagefindVersion:'2'}))],
    ['null', () => new Response('null')], ['array', () => new Response('[]')],
    ['missing chunk kind', () => new Response(JSON.stringify({...manifest(), assets:{[index]:digest}}))],
    ['invalid digest', () => new Response(JSON.stringify({...manifest(), assets:{[index]:'sha256-invalid',[filter]:digest}}))],
    ['invalid path', () => new Response(JSON.stringify({...manifest(), assets:{...manifest().assets,'/pagefind/index/a.b.pf_index':digest}}))],
    ['entry overflow', () => new Response(JSON.stringify({...manifest(), assets:{...manifest().assets,...Object.fromEntries(Array.from({length:2047},(_,i)=>[`/pagefind/index/a${i}.pf_index`,digest]))}}))],
    ['HTTP failure', () => new Response('missing',{status:404})], ['absent body', () => new Response(null)],
    ['network/redirect refusal', () => { throw new TypeError('fetch failed'); }],
  ] as const)('retains rejected %s manifest until explicit Retry', async (_name, response) => {
    let broken=true; const x=setup(async()=>broken ? response() : json());
    await expect(x.target.fetch(index)).rejects.toThrow(); await expect(x.target.fetch(filter)).rejects.toThrow();
    expect(x.original).toHaveBeenCalledTimes(1); expect(x.health.hasFailed()).toBe(true);
    broken=false; x.health.reset(); await x.target.fetch(index); expect(x.health.hasFailed()).toBe(false);
    expect(x.original).toHaveBeenCalledTimes(3);
  });
  it.each([undefined,'1'])('bounds actual streamed bytes despite Content-Length %s and cancels overflow', async length => {
    const cancel=vi.fn(); const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(16384));},cancel});
    const x=setup(async()=>new Response(stream,{headers:length?{'Content-Length':length}:undefined}));
    await expect(x.target.fetch(index)).rejects.toThrow(); expect(cancel).toHaveBeenCalledOnce(); expect(x.health.hasFailed()).toBe(true);
  });
  it('accepts exactly the streamed byte cap and rejects oversized Content-Length early', async () => {
    const body=JSON.stringify(manifest()); const x=setup(async()=>new Response(body+' '.repeat(INTEGRITY_MAX_BYTES-body.length)));
    await x.target.fetch(index); expect(x.health.hasFailed()).toBe(false);
    const y=setup(async()=>new Response(body,{headers:{'Content-Length':String(INTEGRITY_MAX_BYTES+1)}}));
    await expect(y.target.fetch(index)).rejects.toThrow(); expect(y.original).toHaveBeenCalledTimes(1);
  });
  it('rejects unreadable streams and unsupported native integrity without unchecked chunks', async () => {
    const x=setup(async()=>new Response(new ReadableStream({start(c){c.error(new Error('read failed'));}})));
    await expect(x.target.fetch(index)).rejects.toThrow();
    const NativeRequest=Request; vi.stubGlobal('Request',class UnsupportedRequest { });
    const y=setup(); await expect(y.target.fetch(index)).rejects.toThrow(); expect(y.health.hasFailed()).toBe(true);
    expect(y.original.mock.calls.some(([input])=>input===index)).toBe(false); vi.stubGlobal('Request',NativeRequest);
  });
  it('isolates late old manifest failures and successful manifests from the new epoch', async () => {
    const old=deferred<Response>(); let loads=0; const x=setup(()=>++loads===1?old.promise:Promise.resolve(json()));
    const a=x.target.fetch(index); const rejection=expect(a).rejects.toThrow('old'); x.health.reset(); await x.target.fetch(filter);
    old.reject(new Error('old')); await rejection; expect(x.health.hasFailed()).toBe(false);
    const stale=deferred<Response>(); loads=0; const y=setup(()=>++loads===1?stale.promise:Promise.resolve(new Response('{}')));
    const b=y.target.fetch(index); y.health.reset(); await expect(y.target.fetch(index)).rejects.toThrow(); stale.resolve(json()); await b;
    expect(y.health.hasFailed()).toBe(true); await expect(y.target.fetch(filter)).rejects.toThrow(); expect(loads).toBe(2);
  });
  it('keeps native chunk rejections/non-2xx sticky and isolates old chunk completions', async () => {
    const pending=deferred<Response>(); let calls=0; const x=setup(async()=>json(),()=>++calls===1?pending.promise:Promise.resolve(new Response('ok')));
    const a=x.target.fetch(index); const error=new TypeError('integrity mismatch'); const rejection=expect(a).rejects.toBe(error);
    await vi.waitFor(()=>expect(calls).toBe(1)); x.health.reset(); await x.target.fetch(index); pending.reject(error); await rejection;
    expect(x.health.hasFailed()).toBe(false);
    const response=new Response('unavailable',{status:503}); const y=setup(async()=>json(),async()=>response);
    expect(await y.target.fetch(filter)).toBe(response); expect(y.health.hasFailed()).toBe(true);
  });
  it('does not let an old successful chunk clear a newer epoch failure', async () => {
    const pending=deferred<Response>(); let calls=0;
    const x=setup(async()=>json(),async()=>++calls===1?pending.promise:Promise.reject(new TypeError('current failure')));
    const old=x.target.fetch(index); await vi.waitFor(()=>expect(calls).toBe(1)); x.health.reset();
    await expect(x.target.fetch(filter)).rejects.toThrow('current failure'); pending.resolve(new Response('old chunk')); await old;
    expect(x.health.hasFailed()).toBe(true);
  });
  it('honors an explicit signal override and does not mutate frozen init', async () => {
    const inherited=new AbortController(); const override=new AbortController();
    const request=new Request(origin+index,{signal:inherited.signal});
    const init=Object.freeze({signal:override.signal,mode:'same-origin' as const,referrerPolicy:'no-referrer' as const,keepalive:true});
    const x=setup(); await x.target.fetch(request,init);
    const forwarded=x.original.mock.calls.at(-1)?.[1]; expect(forwarded).toEqual({...init,integrity:digest,redirect:'error'});
    expect(forwarded?.signal).toBe(override.signal); expect(forwarded).not.toBe(init);
    const effective=new Request(request,forwarded); inherited.abort(); expect(effective.signal.aborted).toBe(false);
    override.abort(); expect(effective.signal.aborted).toBe(true);
  });
});
