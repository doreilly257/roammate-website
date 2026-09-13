import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createSearchController, createPagefindLoader, observePagefindFetch, safeResultPath } from '../../src/lib/search-client';
const read = (p:string) => readFileSync(new URL('../../'+p, import.meta.url),'utf8');
const rows = (n:number) => Array.from({length:n}, (_,i)=>({data:vi.fn(async()=>({url:`/guides/place-${i}/`,meta:{title:'Place',type:'Guide'},plain_excerpt:'Useful text'}))}));
const integrityResponse = () => new Response(JSON.stringify({version:1,pagefindVersion:'1.5.2',assets:Object.fromEntries(['index/x.pf_index','filter/x.pf_filter','index/a.pf_index','filter/b.pf_filter'].map(path=>['/pagefind/'+path,`sha256-${'A'.repeat(43)}=`]))}));
function setup(n=25) { const results=rows(n); const api={options:vi.fn(async()=>{}),filters:vi.fn(async()=>({country:{Thailand:2},type:{Guide:2}})), search:vi.fn(async()=>({results}))}; const states:any[]=[]; const loader=vi.fn(async()=>api); const controller=createSearchController(loader,s=>states.push(s)); return {controller,api,results,states,loader}; }
describe('search controller',()=>{
 it.each(['index','filter'])('renders swallowed %s integrity failures as error and recovers only on Retry',async kind=>{
   let corrupt=true;
   const fetcher=vi.fn<typeof fetch>(async(input)=>{
     if(input==='/pagefind/integrity.json') return integrityResponse();
     if(corrupt) throw new TypeError('native integrity failure');
     return new Response('chunk');
   });
   const target={fetch:fetcher as typeof fetch,location:{origin:'https://preview.test'}};
   const health=observePagefindFetch(target); const x=setup(1);
   const swallow=async()=>{try{await target.fetch(`/pagefind/${kind}/x.pf_${kind}`);}catch{/* pinned Pagefind swallows chunk failures */}};
   if(kind==='filter') x.api.filters.mockImplementation(async()=>{await swallow();return {country:{Thailand:2},type:{Guide:2}};});
   else x.api.search.mockImplementation(async()=>{await swallow();return {results:corrupt?[]:x.results};});
   const states:any[]=[]; const module={...x.api,destroy:vi.fn(async()=>{})}; const importer=vi.fn(async()=>module);
   const controller=createSearchController(createPagefindLoader(importer),s=>states.push(s),health);
   await controller.search(''); expect(fetcher).not.toHaveBeenCalled();
   await controller.search('Bangkok','Thailand','Guide'); expect(states.at(-1)).toMatchObject({status:'error',items:[],total:0});
   corrupt=false; await controller.search('hiking','Thailand','Guide'); expect(states.at(-1).status).toBe('error');
   await controller.retry(); expect(states.at(-1)).toMatchObject({status:'ready',total:1,query:'hiking',country:'Thailand',type:'Guide'});
   expect(module.destroy).toHaveBeenCalledOnce(); expect(importer).toHaveBeenCalledOnce();
   expect(fetcher.mock.calls.filter(([input])=>input==='/pagefind/integrity.json')).toHaveLength(2);
   expect(fetcher.mock.calls.at(-1)?.[1]).toMatchObject({cache:'reload',redirect:'error'});
 });
 it('reports swallowed chunk failures until explicit Retry clears the poisoned cache',async()=>{
   const x=setup(); let failed=true;
   const health={hasFailed:()=>failed,reset:vi.fn(()=>{failed=false;})};
   const states:any[]=[];
   const controller=createSearchController(x.loader,s=>states.push(s),health);
   await controller.search('Bangkok'); expect(states.at(-1).status).toBe('error');
   await controller.search('hiking'); expect(states.at(-1).status).toBe('error');
   await controller.retry(); expect(states.at(-1).status).toBe('ready');
   expect(health.reset).toHaveBeenCalledOnce();
   failed=false; x.api.search.mockImplementationOnce(async()=>{failed=true;return {results:[]};});
   await controller.search('Bangkok'); expect(states.at(-1).status).toBe('error');
   await controller.retry();
   x.api.search.mockClear(); x.api.filters.mockImplementationOnce(async()=>{failed=true;return {country:{Thailand:2},type:{Guide:2}};});
   await controller.search('Bangkok'); expect(states.at(-1).status).toBe('error');
   expect(x.api.search).not.toHaveBeenCalled();
 });
 it('uses bounded content-free module URLs after browser-cached import failures',async()=>{
   const api={...setup().api,destroy:vi.fn(async()=>{})};
   const importer=vi.fn(async(_path:string)=>api);
   importer.mockRejectedValueOnce(new Error('cached module failure'));
   const load=createPagefindLoader(importer);
   await expect(load()).rejects.toThrow(); await expect(load()).resolves.toBe(api);
   expect(importer.mock.calls.map(([path])=>path)).toEqual(['/pagefind/pagefind.js','/pagefind/pagefind.js?retry=1']);
   await load(); expect(importer).toHaveBeenCalledTimes(2); expect(api.destroy).toHaveBeenCalledOnce();
   const denied=vi.fn(async()=>{throw new Error('offline');});
   const unavailable=createPagefindLoader(denied);
   for(let i=0;i<7;i++) await expect(unavailable()).rejects.toThrow();
   expect(denied).toHaveBeenCalledTimes(4);
 });
 it('recreates the runtime on Retry to clear Pagefind entry and fragment rejection caches',async()=>{
   const x=setup(); x.results[0].data.mockRejectedValueOnce(new Error('cached fragment failure'));
   await x.controller.search('trip','Thailand','Guide');
   await x.controller.retry();
   expect(x.loader).toHaveBeenCalledTimes(2);
   expect(x.api.options).toHaveBeenCalledTimes(2);
   expect(x.states.at(-1)).toMatchObject({query:'trip',country:'Thailand',type:'Guide',status:'ready'});
 });
 it('offers reload rather than endless Retry after the bounded module attempts fail',async()=>{
   const importer=vi.fn(async()=>{throw new Error('offline');});
   const states:any[]=[];
   const controller=createSearchController(createPagefindLoader(importer),s=>states.push(s));
   await controller.search('private');
   for(let i=0;i<3;i++) await controller.retry();
   expect(states.at(-1)).toMatchObject({status:'error',retryable:false});
   expect(importer).toHaveBeenCalledTimes(4);
 });
 it('ignores stale success after filter changes and reset', async()=>{
   const x=setup();
   let resolve!:(value:{results:ReturnType<typeof rows>})=>void;
   x.api.search.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
   const old=x.controller.search('trip','Thailand');
   await vi.waitFor(()=>expect(x.api.search).toHaveBeenCalled());
   await x.controller.search('trip','','Blog');
   const stale=rows(2); resolve({results:stale}); await old;
   expect(stale[0].data).not.toHaveBeenCalled();
   expect(x.states.at(-1)).toMatchObject({type:'Blog',status:'ready'});
   await x.controller.reset();
   expect(x.states.at(-1).status).toBe('idle');
 });
 it('omits unknown country facets and leaves All unfiltered', async()=>{
   const x=setup(1); await x.controller.search('trip');
   expect(x.api.search).toHaveBeenCalledWith('trip',{filters:{}});
   expect(Object.keys(x.states.at(-1).facets.country)).toEqual(['Thailand']);
 });
 it('does not duplicate hydration during repeated Load more clicks',async()=>{
   const x=setup(); await x.controller.search('trip');
   await Promise.all([x.controller.more(),x.controller.more()]);
   expect(x.states.at(-1).items).toHaveLength(20);
   await x.controller.more(); expect(x.states.at(-1).items).toHaveLength(25);
 });
 it('does not enumerate empty queries and hydrates ten at a time',async()=>{const x=setup();await x.controller.search('');expect(x.loader).not.toHaveBeenCalled();await x.controller.search('bangkok');expect(x.results.filter(r=>r.data.mock.calls.length)).toHaveLength(10);await x.controller.more();expect(x.results.filter(r=>r.data.mock.calls.length)).toHaveLength(20);expect(x.api.options).toHaveBeenCalledWith({baseUrl:'/',noWorker:true});});
 it('combines country and type and reset clears them',async()=>{const x=setup();await x.controller.search('trip','Thailand','Guide');expect(x.api.search).toHaveBeenCalledWith('trip',{filters:{country:'Thailand',type:'Guide'}});x.controller.reset();expect(x.states.at(-1)).toMatchObject({query:'',country:'',type:'',items:[],status:'idle'});});
 it('debounces',async()=>{vi.useFakeTimers();const x=setup();x.controller.schedule('a');x.controller.schedule('ab');await vi.advanceTimersByTimeAsync(200);expect(x.api.search).toHaveBeenCalledTimes(1);vi.useRealTimers();});
 it('ignores stale failures',async()=>{const x=setup();let reject!:(e:Error)=>void;x.api.search.mockImplementationOnce(()=>new Promise((_,r)=>{reject=r;}));const old=x.controller.search('old');await vi.waitFor(()=>expect(x.api.search).toHaveBeenCalled());await x.controller.search('new');reject(new Error('old'));await old;expect(x.states.at(-1)).toMatchObject({query:'new',status:'ready'});});
 it('retries runtime, search and hydration failures',async()=>{const x=setup();x.loader.mockRejectedValueOnce(new Error('offline'));await x.controller.search('trip');expect(x.states.at(-1).status).toBe('error');await x.controller.retry();expect(x.loader).toHaveBeenCalledTimes(2);expect(x.states.at(-1).status).toBe('ready');x.api.search.mockRejectedValueOnce(new Error('offline'));await x.controller.search('trip');expect(x.states.at(-1).status).toBe('error');await x.controller.retry();x.results[0].data.mockRejectedValueOnce(new Error('fragment'));await x.controller.search('trip');expect(x.states.at(-1).status).toBe('error');await x.controller.retry();expect(x.states.at(-1).status).toBe('ready');});
 it('rejects unsafe and noncanonical links',()=>{expect(safeResultPath('/guides/bangkok/','https://preview.test')).toBe('/guides/bangkok/');for(const path of ['https://evil.test/guides/a/','javascript:alert(1)','//evil.test/guides/a/','/guides/a/?q=x','/guides/a/#x','/guides/a','/guides/../blog/a/','/search/']) expect(safeResultPath(path,'https://preview.test')).toBeNull();});
});
describe('search-page fetch health observer',()=>{
 it('preserves unrelated arguments and response identity and only flags local index/filter failures',async()=>{
   const response=new Response('missing',{status:503});
   const fetcher=vi.fn<typeof fetch>(async(input)=>input==='/pagefind/integrity.json'?integrityResponse():response);
   const target={fetch:fetcher as typeof fetch,location:{origin:'https://preview.test'}};
   const health=observePagefindFetch(target);
   const options={cache:'no-cache' as const};
   for(const url of ['/api/test','https://other.test/pagefind/index/x.pf_index','/pagefind/fragment/x.pf_fragment','/guides/pagefind/index/x.pf_index']) {
     expect(await target.fetch(url,options)).toBe(response); expect(health.hasFailed()).toBe(false);
   }
   expect(fetcher).toHaveBeenLastCalledWith('/guides/pagefind/index/x.pf_index',options);
   await target.fetch('/pagefind/index/x.pf_index'); expect(health.hasFailed()).toBe(true);
   health.reset(); await target.fetch(new Request('https://preview.test/pagefind/filter/x.pf_filter')); expect(health.hasFailed()).toBe(true);
   health.reset(); const healthy=new Response('ok'); fetcher.mockImplementation(async(input)=>input==='/pagefind/integrity.json'?integrityResponse():healthy);
   expect(await target.fetch(new URL('https://preview.test/pagefind/index/x.pf_index'))).toBe(healthy);
   expect(health.hasFailed()).toBe(false);
 });
 it('keeps chunk rejection sticky across operations but ignores pre-reset in-flight failures',async()=>{
   let reject!:(error:Error)=>void;
   const failure=new Error('network');
   const target={fetch:vi.fn<typeof fetch>(async(input)=>input==='/pagefind/integrity.json'?integrityResponse():new Promise<Response>((_,r)=>{reject=r;})) as typeof fetch,location:{origin:'https://preview.test'}};
   const health=observePagefindFetch(target);
   const old=target.fetch('/pagefind/index/a.pf_index'); await vi.waitFor(()=>expect(reject).toBeDefined()); health.reset(); reject(failure);
   await expect(old).rejects.toBe(failure); expect(health.hasFailed()).toBe(false);
   const previous=reject; const current=target.fetch('/pagefind/filter/b.pf_filter'); await vi.waitFor(()=>expect(reject).not.toBe(previous)); reject(failure);
   await expect(current).rejects.toBe(failure); expect(health.hasFailed()).toBe(true);
 });
});
describe('search surface contracts',()=>{
 it('provides clean native fallback and analytics exclusions',()=>{const nav=read('src/components/Nav.astro');expect(nav).toMatch(/role="search"/);expect(nav).toContain('action="/search/"');expect(nav).toContain('ph-no-capture ph-mask');expect(nav.match(/<input[^>]*type="search"[^>]*>/)?.[0]).not.toMatch(/\bname=/);});
 it('uses scoped metadata, safe rendering and accessible controls',()=>{const page=read('src/pages/search.astro');expect(page).toContain('analyticsEnabled={false}');expect(page).toContain('noindex');const ui=read('src/components/SiteSearch.astro');expect(ui).toContain('aria-live="polite"');expect(ui).toContain('<noscript>');expect(ui).not.toContain('innerHTML');expect(ui).not.toContain('autofocus');expect(read('astro.config.mjs')).toContain('/search-manifest.json');});
});
