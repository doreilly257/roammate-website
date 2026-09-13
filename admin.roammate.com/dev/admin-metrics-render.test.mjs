import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { transform } from '@astrojs/compiler';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import ts from 'typescript';
import { api } from '../src/lib/api.ts';

const dataModule=source=>`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64')}`;
const modules={};
for(const name of ['format','charts','admin-metrics']) modules[name]=dataModule(readFileSync(new URL(`../src/lib/${name}.ts`,import.meta.url),'utf8').replaceAll("'./format'",JSON.stringify(modules.format)));
const pages={};
for(const name of ['index','quality']) {
  let source=readFileSync(new URL(`../src/pages/${name}.astro`,import.meta.url),'utf8')
    .replace(/^import AdminLayout.*;\n/m,'').replace(/^import \{ api,.*;\n/m,'const api = Astro.locals.testApi;\n').replaceAll('AdminLayout','main');
  for(const [name,url] of Object.entries(modules)) source=source.replaceAll(`'../lib/${name}'`,JSON.stringify(url));
  const {code}=await transform(source,{filename:`${name}-metrics-render.astro`,internalURL:import.meta.resolve('astro/compiler-runtime'),renderScript:true,resultScopedSlot:true,resolvePath:s=>s});
  pages[name]=(await import(dataModule(code))).default;
}
const overview={generatedAt:'2026-09-13T00:00:00Z',users:{total:1,verified:0,ejected:0,new7d:0,new30d:0,active7d:0},excursions:{total:0,upcoming:0,deleted:0,new7d:0,participants:0},content:{albumsWithMedia:2,albums:9,media:5,messages7d:0},queues:{reportsOpen:0,sosOpen:0,verificationPending:0}};
const data={ '/overview':overview, '/timeseries?days=30':{points:[]}, '/activity?limit=12':{events:[]}, '/quality/tables':{tables:[{table:'users',rows:1},{table:'verification_webhook_events',rows:0}]}, '/quality/columns':{profiles:[{table:'verification_webhook_events',rows:1,columns:[{column:'state',filled:1,blank:0,distinct:1},{column:'SENSITIVE_PROVIDER_PAYLOAD',filled:1,blank:1,distinct:1}]}]}, '/quality/integrity':{checks:[]}, '/quality/anomalies':{anomalies:[]}, '/quality/freshness':{sources:[]} };
async function render(name,overrides={},testApi) {
 const container=await AstroContainer.create();
 return container.renderToString(pages[name],{locals:{runtime:{env:{API_BASE_URL:'https://fixture.test',ADMIN_API_KEY:'fixture-only'}},testApi:testApi??{get:async(_,path)=>Object.hasOwn(overrides,path)?overrides[path]:{ok:true,data:data[path]}}}});
}
for(const name of ['index','quality']) test(`${name}: shared album labels survive old API and failed overview`,async()=>{
  const current=await render(name); assert.match(current,/Albums with media/); assert.match(current,/Total albums/); assert.match(current,/Includes empty album scaffolds/);
  const {albumsWithMedia,...oldContent}=overview.content;
  const old=await render(name,{'/overview':{ok:true,data:{...overview,content:oldContent}}});
  assert.match(old,/not returned by this API response/); assert.match(old,/Media items/);
  const failed=await render(name,{'/overview':{ok:false,error:'PRIVATE_ERROR',status:503}});
  assert.match(failed,/Could not load overview data \(HTTP 503\)/); assert.match(failed,/Albums with media/); assert.match(failed,/Unavailable/); assert.doesNotMatch(failed,/PRIVATE_ERROR/);
});
test('dedicated webhook rendering never leaks unexpected fields or generic completeness/freshness claims',async()=>{
 const html=await render('quality'); assert.match(html,/Verification webhook evidence/); assert.match(html,/retained ledger records, not lifetime webhook deliveries/);
 assert.match(html,/zero not distinguishable from probe failure/); assert.doesNotMatch(html,/SENSITIVE_PROVIDER_PAYLOAD/);
 const section=html.match(/<section[^>]*id="webhook-evidence"[\s\S]*?<\/section>/)?.[0];
 assert.ok(section); assert.doesNotMatch(section,/class="pill (ok|bad)|<meter|fill-meter|never|healthy/);
 assert.match(section,/Processing includes ignored events/);
});
for(const endpoint of ['/quality/tables','/quality/columns','/quality/freshness','/quality/integrity','/quality/anomalies']) test(`quality partial rendering survives ${endpoint} failure`,async()=>{
 const html=await render('quality',{[endpoint]:{ok:false,error:'PRIVATE_ERROR',status:503}});
 assert.match(html,/Verification webhook evidence/); assert.match(html,/Albums with media/); assert.match(html,/Could not load/); assert.doesNotMatch(html,/PRIVATE_ERROR/);
});
for(const mode of ['json','text','network']) for(const page of ['index','quality']) test(`${page}: sanitizes actual API ${mode} errors`,async t=>{
 const sentinel='SENSITIVE_ID_DOCUMENT_OR_CREDENTIAL';
 t.mock.method(globalThis,'fetch',async()=>{
   if(mode==='network') throw new Error(sentinel);
   return new Response(mode==='json'?JSON.stringify({error:sentinel}):sentinel,{status:503});
 });
 const html=await render(page,{},api);
 assert.doesNotMatch(html,new RegExp(sentinel)); assert.match(html,/Could not load overview data/); assert.match(html,/Unavailable/);
});
