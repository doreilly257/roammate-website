#!/usr/bin/env node
/**
 * Labels api_error groups with TypeSafe's Jev: test traffic, a dead third-party
 * provider, a by-design server refusal, the user's own network, or a genuine
 * bug. WARN-ONLY: always exits 0, and prints REVIEW for anything it is not
 * confident about so a person decides.
 *
 * Input is AGGREGATES ONLY, one JSON object per group: platform, endpoint (ids
 * already replaced by :id), status, reason, events, people, emulator_share,
 * testflight_share, days_active, versions, hardcoded_id_hits, last_seen. Never
 * pass person ids, emails or error message text: this goes to api.typesafe.ai.
 *
 * Key: TYPESAFE_API_KEY, or ~/.secrets/typesafe.env. Without one it skips.
 *
 * Usage: node scripts/triage-errors-jev.mjs groups.json   (a JSON array)
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const MODEL = 'jev-1.13.0'; // pinned so a threshold tuned today means the same tomorrow
const CONFIDENT = 0.8;
const AMBIGUOUS = 0.5;
const CONCURRENCY = 6;

const QUESTIONS = {
  test_traffic: {
    type: 'noul',
    instructions:
      'Was this error group produced by test activity (simulators or emulators, automated tests, developers, or hard-coded test ids) rather than by real users of the app?',
    criteria: {
      true: 'Most events come from emulators or a handful of test identities, or hit hard-coded test ids.',
      false: 'Many distinct people on real devices produce it.',
    },
  },
  dead_provider: {
    type: 'noul',
    instructions:
      'Is this group caused by an external third-party service the app depends on (weather, maps or directions, a sign-in provider) failing or being unavailable?',
    criteria: {
      true: 'The endpoint proxies a third-party service and the status is a server-side failure such as 500, 502 or 503.',
      false: 'The endpoint is the app\'s own feature logic, or the failure is a client or auth error.',
    },
  },
  server_rejection: {
    type: 'noul',
    instructions:
      'Is this a by-design refusal from the server that needs no code change: a feature switched off, a duplicate registration, or an expired session that the app recovers from?',
    criteria: {
      true: 'The server is correctly refusing and the refusal is expected behaviour.',
      false: 'The request should have succeeded, or the client should never have sent it.',
    },
  },
  user_network: {
    type: 'noul',
    instructions:
      "Is this group the user's own connectivity failing, so the request never reached the server?",
    criteria: {
      true: 'Status is a local transport sentinel such as -1 or 0 with a network reason and no HTTP response.',
      false: 'The server answered with an HTTP status.',
    },
  },
  genuine_bug: {
    type: 'noul',
    instructions:
      'Is this a defect in the app or its server that is hurting real users and needs a code fix?',
    criteria: {
      true: 'Real people on real devices keep hitting a request that should succeed, for example a 400 the client causes or a 401 fired before the session is ready.',
      false: 'It is test traffic, the user\'s network, a third-party outage, or an expected refusal.',
    },
  },
};

function apiKey() {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY;
  const p = join(homedir(), '.secrets', 'typesafe.env');
  if (!existsSync(p)) return '';
  const m = readFileSync(p, 'utf8').match(/^TYPESAFE_API_KEY=(.+)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

function describe(g) {
  return [
    `API error group from the roammate travel app (${g.platform}).`,
    `Request: ${g.endpoint}. HTTP status: ${g.status}. Client reason code: ${g.reason}.`,
    `${g.events} events from ${g.people} distinct people over ${g.days_active} days, last seen ${g.last_seen}.`,
    `Share of events from emulators or simulators: ${g.emulator_share}. From TestFlight builds: ${g.testflight_share}.`,
    `Events that hit hard-coded test ids: ${g.hardcoded_id_hits}. App versions: ${(g.versions || []).join(', ')}.`,
    'Status -1 or 0 means the request never got an HTTP response.',
  ].join(' ');
}

async function ask(key, state, attempt = 0) {
  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, model: MODEL, questions: QUESTIONS }),
  });
  if ((res.status === 429 || res.status === 503 || res.status === 529) && attempt < 4) {
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    return ask(key, state, attempt + 1);
  }
  if (!res.ok) throw new Error(`TypeSafe ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const key = apiKey();
if (!key) {
  console.log('error triage: skipped, no TYPESAFE_API_KEY');
  process.exit(0);
}
const file = process.argv[2];
if (!file) {
  console.log('usage: node scripts/triage-errors-jev.mjs groups.json');
  process.exit(0);
}

// Facts are settled here, not asked: on 2026-09-21 Jev scored a group that was
// 100% simulator traffic from 2 identities as genuine_bug 0.71, because the
// endpoint (/sos/alerts) sounded important. Jev only judges groups real users hit.
function fact(g) {
  const synthetic = (g.emulator_share ?? 0) + (g.testflight_share ?? 0);
  if (synthetic >= 0.9 || (g.hardcoded_id_hits ?? 0) >= g.events / 2) {
    return ['test_traffic', `synthetic share ${synthetic.toFixed(2)}, hard-coded ids ${g.hardcoded_id_hits ?? 0}`];
  }
  if (['-1', '0', '-1.0'].includes(String(g.status))) return ['user_network', 'no HTTP response'];
  return null;
}

const groups = JSON.parse(readFileSync(file, 'utf8'));
const results = new Array(groups.length);
let next = 0;
let failed = 0;
async function worker() {
  while (next < groups.length) {
    const i = next++;
    const settled = fact(groups[i]);
    if (settled) {
      results[i] = { group: groups[i], verdict: settled[0], scores: [], note: `rule: ${settled[1]}` };
      continue;
    }
    try {
      const { answers } = await ask(key, describe(groups[i]));
      const scores = Object.entries(answers)
        .map(([label, a]) => [label, a.noul])
        .sort((a, b) => b[1] - a[1]);
      const [[top, p], [, second]] = scores;
      const verdict = p >= CONFIDENT && second < AMBIGUOUS ? top : 'REVIEW';
      results[i] = { group: groups[i], verdict, scores };
    } catch (err) {
      failed++;
      results[i] = { group: groups[i], verdict: 'FAILED', scores: [], error: err.message };
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

for (const r of results) {
  const g = r.group;
  const top = r.scores.slice(0, 2).map(([l, p]) => `${l} ${p.toFixed(2)}`).join(', ');
  console.log(`${r.verdict.padEnd(16)} ${g.platform} ${g.endpoint} ${g.status}  (${g.events} ev / ${g.people} ppl)  ${r.note ?? top}${r.error ? '  ' + r.error : ''}`);
}
const review = results.filter((r) => r.verdict === 'REVIEW').length;
console.log(`error triage (warn-only): ${results.length} group(s), ${review} to review, ${failed} failed`);
