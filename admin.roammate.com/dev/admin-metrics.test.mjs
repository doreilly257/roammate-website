import assert from 'node:assert/strict';
import { test } from 'node:test';
import { albumMetrics, webhookEvidence, safeRequestError, countMetric } from '../src/lib/admin-metrics.ts';

test('album metrics distinguish stored media albums, all scaffolds, missing additions and genuine zeros', () => {
  const current=albumMetrics({albumsWithMedia:2,albums:9,media:5});
  assert.deepEqual(current.cards.map(c=>c.metric.value),[2,9,5]);
  assert.deepEqual(current.cards.map(c=>c.label),['Albums with media','Total albums','Media items']);
  assert.match(current.cards[1].help,/empty album scaffolds/);
  const old=albumMetrics({albums:9,media:0});
  assert.equal(old.cards[0].metric.value,null); assert.match(old.cards[0].metric.note,/not returned/);
  assert.equal(old.cards[2].metric.value,0);
  assert.ok(albumMetrics(null).cards.every(c=>c.metric.value===null));
  const inconsistent=albumMetrics({albumsWithMedia:10,albums:9,media:5});
  assert.equal(inconsistent.cards[0].metric.value,null); assert.equal(inconsistent.cards[1].metric.value,null);
  assert.equal(inconsistent.cards[2].metric.value,5); assert.match(inconsistent.warning,/inconsistent/i);
});
for(const value of [null,-1,NaN,Infinity,1.2,'4',{},Number.MAX_SAFE_INTEGER+1]) test(`invalid count is unavailable: ${String(value)}`,()=>assert.equal(countMetric(value).value,null));
const profile={table:'verification_webhook_events',rows:4,columns:[{column:'state',filled:4,blank:0,distinct:2},{column:'received_at',filled:4,blank:0,distinct:3},{column:'processed_at',filled:2,blank:2,distinct:2},{column:'attempt_count',filled:4,blank:0,distinct:4},{column:'secret_payload',filled:4,blank:0,distinct:4}]};
const now=Date.parse('2026-09-13T12:00:00Z');
test('webhook section preserves reported table zero but treats aggregate zero as ambiguous',()=>{
  const e=webhookEvidence([{table:profile.table,rows:0}],[profile],[{id:'verification_webhook_received',latest:'2026-09-13T11:00:00Z'},{id:'verification_webhook_processed',latest:null}],now);
  assert.equal(e.rows.value,0); assert.equal(e.columns.length,4);
  assert.equal(e.columns[0].filled.value,4); assert.match(e.columns[0].filled.note,/Reported aggregate/);
  assert.equal(e.columns[0].blank.value,null); assert.match(e.columns[0].blank.note,/zero not distinguishable/);
  assert.equal(e.columns[0].distinct.value,2); assert.equal(e.columns[1].distinct,undefined);
  assert.match(e.received.text,/2026-09-13T11:00:00.000Z/); assert.match(e.received.note,/1 hour ago/);
  assert.match(e.processed.note,/no reliable recorded timestamp/);
  assert.doesNotMatch(JSON.stringify(e),/secret_payload|completeness|healthy/);
});
test('missing and duplicate expected entries are unavailable, never silently selected',()=>{
  const missing=webhookEvidence([],[],[],now);
  assert.match(missing.rows.note,/not returned/); assert.match(missing.received.note,/not returned/);
  const e=webhookEvidence([{table:profile.table,rows:2},{table:profile.table,rows:3}],[profile,profile],[{id:'verification_webhook_received',latest:'2026-09-13T11:00:00Z'},{id:'verification_webhook_received',latest:'2026-09-13T11:00:00Z'}],now);
  assert.equal(e.rows.value,null); assert.equal(e.columns[0].filled.value,null); assert.equal(e.received.text,'Unavailable');
});
test('failed profile and malformed/duplicate aggregate values remain unavailable',()=>{
  for(const rows of [-1,null,'4']) assert.ok(webhookEvidence([], [{...profile,rows}],[],now).columns.every(c=>c.filled.value===null));
  const e=webhookEvidence([],[{...profile,columns:[{column:'state',filled:-1,blank:NaN,distinct:'2'},...profile.columns.slice(1)]}],[],now);
  assert.equal(e.columns[0].filled.value,null); assert.equal(e.columns[0].distinct.value,null);
  assert.equal(webhookEvidence([],[{...profile,columns:[...profile.columns,profile.columns[0]]}],[],now).columns[0].filled.value,null);
});
test('timestamps reject invalid dates and distinguish future clocks without health claims',()=>{
  for(const latest of [null,'nonsense','2026-02-30T12:00:00Z','2026-09-13 10:00:00',123]) {
    const e=webhookEvidence([],[],[{id:'verification_webhook_received',latest}],now);
    assert.equal(e.received.text,'Unavailable'); assert.match(e.received.note,/no reliable/);
  }
  const future=webhookEvidence([],[],[{id:'verification_webhook_received',latest:'2026-09-14T12:00:00Z'}],now);
  assert.match(future.received.text,/2026-09-14/); assert.match(future.received.note,/clock|future/i);
});
test('request-context errors never contain upstream detail and only show validated status',()=>{
  for(const status of [0,'503',NaN,1000,-1]) assert.equal(safeRequestError({ok:false,error:'SENSITIVE',status},'overview'),'Could not load overview data — unavailable');
  assert.equal(safeRequestError({ok:false,error:'SENSITIVE',status:503},'freshness'),'Could not load webhook freshness data (HTTP 503)');
  assert.equal(safeRequestError({ok:true},'overview'),null);
});
