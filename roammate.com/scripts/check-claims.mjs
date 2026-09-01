#!/usr/bin/env node
/**
 * Fail if site copy reintroduces a claim whose gate is still closed.
 *
 * The site told users in sixteen places that every account is identity-verified
 * while the mandate was deliberately inert. Nothing caught it — not the build,
 * not astro check, not review. The rules below are the claims already found and
 * fixed; this stops them coming back.
 *
 * A rule needs evidence the CLAIM is false: a flag that is off, an endpoint that
 * 404s, a UI that does not exist, a route that is gated. An open ticket near a
 * claim is a reason to look, never a reason to add a rule here — ticket titles
 * describe work remaining, claims describe capability, and they share nouns.
 * Three rules were written that way and all three were wrong.
 *
 * Retire a rule by SHIPPING the feature, then deleting the rule. Never by
 * softening the sentence until it stops matching.
 *
 * A clean run means no LISTED claim matched a KNOWN-FALSE pattern. It does not
 * mean the copy is honest — it cannot see a missing qualifier, a claim nobody
 * thought to gate, or a claim that becomes false later.
 *
 * Usage: node scripts/check-claims.mjs [--all]
 *        default scans files changed vs origin/main; --all scans everything.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RULES = [
  {
    id: 'verification-is-mandatory',
    why: 'Identity verification is OPTIONAL. verification_gate_enabled is false in DEFAULT_FLAGS and getFeatureFlags falls back to defaults even when the KV read throws. Most accounts are unverified.',
    retiresWhen: 'the mandate ships (roammate-app-ios bead 8jlf) — and check whether existing accounts are grandfathered before writing "every account" again',
    patterns: [
      /every (user|account|profile|traveller)[^.]{0,40}verif/i,
      /all (users|accounts|profiles|travellers)[^.]{0,40}verif/i,
      /verified (travellers|users|profiles) (only|before)/i,
      /verif\w*[^.]{0,30}before (you can|they can|matching|any connection|connecting)/i,
      /identity[- ]verified\b/i,
      /\bhard gate\b/i,
    ],
  },
  {
    id: 'request-to-join',
    why: 'POST /v1/excursions/:id/join-requests is gated by areAccessRoutesEnabled, needing EXCURSION_PRIVACY_ENABLED at stage >= write. The flag is absent from api/wrangler.toml so the route 404s. Direct join works; requesting to join does not.',
    retiresWhen: 'EXCURSION_PRIVACY_ENABLED is set to write or higher in production',
    patterns: [/request to join/i, /request a (spot|place)/i, /ask to join/i],
  },
  {
    id: 'ai-concierge',
    why: 'GET /suggestions returns 404 to every caller — ai_concierge_enabled defaults false and the key is absent from production KV. The Discover surface is also two taps deep behind a non-default segment, so turning the flag on alone would not make it reachable.',
    retiresWhen: 'the flag is on in production AND the surface is reachable',
    patterns: [/ai (travel )?concierge/i],
  },
  {
    id: 'sms-alerts',
    why: 'SMS was removed by product decision on 2026-08-25. Phone-only emergency contacts receive nothing, by design, and the app says so rather than pretending. Alerts are delivered by email only.',
    retiresWhen: 'SMS delivery is reinstated',
    patterns: [
      /\b(sms|text message)s?\b[^.]{0,40}(alert|emergency|contact)/i,
      /(alert|emergency|contact)[^.]{0,40}\bby (sms|text)\b/i,
    ],
  },
];

const ROOTS = ['src/pages', 'src/components', 'src/layouts', 'src/content'];
const EXTRA = ['public/llms.txt', 'public/llms-full.txt'];
const EXT = /\.(astro|md|mdx|json|txt|ts)$/;

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function changedFiles() {
  const base = git(['merge-base', 'HEAD', 'origin/main']) || git(['rev-parse', 'HEAD~1']);
  if (!base) return [];
  return git(['diff', '--name-only', `${base}...HEAD`]).split('\n').filter(Boolean);
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

const scanAll = process.argv.includes('--all');
const candidates = scanAll
  ? [...ROOTS.flatMap((r) => walk(r)), ...EXTRA]
  : changedFiles().map((f) => f.replace(/^roammate\.com\//, ''));

const files = candidates.filter(
  (f) => EXT.test(f) && (ROOTS.some((r) => f.startsWith(r)) || EXTRA.includes(f)) && existsSync(f),
);

let hits = 0;
for (const file of files) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  // strip style/script so CSS and logic never trip a prose rule
  const prose = text.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, '');
  for (const rule of RULES) {
    for (const pat of rule.patterns) {
      const m = prose.match(pat);
      if (!m) continue;
      const line = prose.slice(0, m.index).split('\n').length;
      if (hits === 0) console.error('\nClaims whose gate is still closed:\n');
      hits++;
      console.error(`  ${file}:${line}`);
      console.error(`    matched   ${JSON.stringify(m[0].slice(0, 70))}`);
      console.error(`    rule      ${rule.id}`);
      console.error(`    why       ${rule.why}`);
      console.error(`    retires   ${rule.retiresWhen}\n`);
      break;
    }
  }
}

if (hits) {
  console.error(`FAIL — ${hits} claim(s). Fix the copy, or ship the feature and delete the rule.\n`);
  process.exit(1);
}
console.log(`claims: clean (${files.length} file${files.length === 1 ? '' : 's'} scanned)`);
