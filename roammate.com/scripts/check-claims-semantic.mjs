#!/usr/bin/env node
/**
 * Semantic companion to check-claims.mjs. WARN-ONLY: always exits 0.
 *
 * check-claims.mjs matches known phrasings of claims whose gate is closed. This
 * asks TypeSafe's Jev model whether a passage makes one of those claims in ANY
 * wording, so a reworded sentence cannot slip past the regexes.
 *
 * An answer is a probability, not proof. It stays warn-only until the threshold
 * has been tuned on real copy. Claims and their evidence live in check-claims.mjs;
 * add a question here only for a rule that exists there.
 *
 * Sends PUBLIC site copy only to api.typesafe.ai. Never point it at user data.
 * Key: TYPESAFE_API_KEY, or ~/.secrets/typesafe.env. Without one it skips.
 *
 * Usage: node scripts/check-claims-semantic.mjs [--all] [--text "sentence"]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const MODEL = 'jev-1.13.0'; // pinned so a threshold tuned today means the same tomorrow
const FLAG = 0.8;
const REVIEW = 0.5;
const CONCURRENCY = 6;

const QUESTIONS = {
  'verification-is-mandatory': {
    type: 'noul',
    instructions:
      'Does this text state or imply that identity verification is required of all roammate users, or that everyone a user can meet on roammate has been identity-verified?',
    criteria: {
      true: 'Verification is presented as universal, mandatory, or a precondition for matching or connecting.',
      false: 'Verification is absent, optional, available to those who choose it, or a badge only some users have.',
    },
  },
  'request-to-join': {
    type: 'noul',
    instructions:
      "Does this text say a roammate user can request, ask or apply to join another traveller's trip or excursion and wait for the organiser to approve?",
    criteria: {
      true: 'An approval or request step before joining is described as something the app offers.',
      false: 'Joining is direct, or joining is not discussed.',
    },
  },
  'ai-concierge': {
    type: 'noul',
    instructions:
      'Does this text claim roammate has an AI assistant or AI concierge that gives the user travel suggestions or plans?',
    criteria: {
      true: 'An AI-powered suggestion or concierge feature is presented as available in roammate.',
      false: 'No such feature is claimed, or AI is mentioned only about other products.',
    },
  },
  'sms-alerts': {
    type: 'noul',
    instructions:
      'Does this text say roammate sends SMS or phone text messages, for example to emergency contacts or as safety alerts?',
    criteria: {
      true: 'SMS or text-message delivery by roammate is described as available.',
      false: 'Alerts are by email or push only, or SMS is not mentioned, or SMS is said to be unavailable.',
    },
  },
};

const ROOTS = ['src/pages', 'src/components', 'src/layouts', 'src/content'];
const EXTRA = ['public/llms.txt', 'public/llms-full.txt'];
const EXT = /\.(astro|md|mdx|txt)$/;

function apiKey() {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY;
  const p = join(homedir(), '.secrets', 'typesafe.env');
  if (!existsSync(p)) return '';
  const m = readFileSync(p, 'utf8').match(/^TYPESAFE_API_KEY=(.+)$/m);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Paragraph-sized passages of visible prose, each with its starting line.
function passages(text) {
  const blanked = (s) => s.replace(/[^\n]/g, ' ');
  const prose = text
    .replace(/^---\n[\s\S]*?\n---/, blanked)
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, blanked);
  const out = [];
  let line = 1;
  for (const block of prose.split(/(\n\s*\n|<\/(?:p|li|h[1-6]|td|div|section)>)/)) {
    const clean = block.replace(/<[^>]+>/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length >= 40 && /[a-z]{3,} [a-z]{3,}/i.test(clean)) out.push({ line, text: clean.slice(0, 1200) });
    line += (block.match(/\n/g) || []).length;
  }
  return out;
}

async function ask(key, state, attempt = 0) {
  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, model: MODEL, questions: QUESTIONS }),
  });
  if ((res.status === 429 || res.status === 529) && attempt < 4) {
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    return ask(key, state, attempt + 1);
  }
  if (!res.ok) throw new Error(`TypeSafe ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const key = apiKey();
if (!key) {
  console.log('claims (semantic): skipped, no TYPESAFE_API_KEY');
  process.exit(0);
}

const textArg = process.argv.indexOf('--text');
let work;
if (textArg !== -1) {
  work = [{ file: '(--text)', line: 1, text: process.argv[textArg + 1] || '' }];
} else {
  const scanAll = process.argv.includes('--all');
  const base = git(['merge-base', 'HEAD', 'origin/main']) || git(['rev-parse', 'HEAD~1']);
  const candidates = scanAll
    ? [...ROOTS.flatMap((r) => walk(r)), ...EXTRA]
    : (base ? git(['diff', '--name-only', `${base}...HEAD`]).split('\n') : []).map((f) => f.replace(/^roammate\.com\//, ''));
  const files = candidates.filter(
    (f) => EXT.test(f) && (ROOTS.some((r) => f.startsWith(r)) || EXTRA.includes(f)) && existsSync(f),
  );
  work = files.flatMap((file) => passages(readFileSync(file, 'utf8')).map((p) => ({ file, ...p })));
}

const findings = [];
let tokens = 0;
let failed = 0;
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < work.length) {
      const item = work[next++];
      try {
        const r = await ask(key, item.text);
        tokens += r.usage?.input_tokens || 0;
        for (const [id, a] of Object.entries(r.answers || {})) {
          if (a.noul >= REVIEW) findings.push({ ...item, id, p: a.noul });
        }
      } catch (e) {
        if (failed++ === 0) console.error(`claims (semantic): ${e.message}`);
      }
    }
  }),
);

findings.sort((a, b) => b.p - a.p);
for (const f of findings) {
  console.error(`  ${f.p >= FLAG ? 'LIKELY' : 'review'} ${f.p.toFixed(2)}  ${f.id}  ${f.file}:${f.line}`);
  console.error(`    ${JSON.stringify(f.text.slice(0, 140))}`);
}
const likely = findings.filter((f) => f.p >= FLAG).length;
console.log(
  `claims (semantic, warn-only): ${work.length} passage(s), ${likely} likely, ${findings.length - likely} to review, ${failed} failed, ${tokens} input tokens`,
);
