// Emits src/data/guide-lastmod.json: guide slug -> ISO date of the last commit
// that touched its content file.
//
// The sitemap previously derived lastmod for programmatic pages from a hash of
// the pathname (EPOCH 2024-01-01 minus hash%365 days). That kept the value
// stable across builds, which was the goal, but it also stamped every one of
// those ~1,800 URLs with a date in 2023 -- before the site existed -- which
// tells Google the page has been stale for years. Git already knows when each
// guide actually changed, so use that.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'src/content/guides';
const OUT = 'src/data/guide-lastmod.json';

// One `git log` pass over the whole directory rather than a call per file.
const raw = execSync(
  `git log --format=%x00%cI --name-only -- ${DIR}`,
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
);

const dates = {};
let current = null;
for (const line of raw.split('\n')) {
  if (line.startsWith('\0')) { current = line.slice(1).trim(); continue; }
  const f = line.trim();
  // git prints paths relative to the REPO ROOT, which is one level above this
  // package (roammate.com/src/content/guides/x.json), so match on the suffix.
  if (!f || !f.includes(`${DIR}/`) || !f.endsWith('.json') || !current) continue;
  const slug = path.basename(f, '.json');
  // git log is newest-first, so the first date seen for a file is its latest.
  if (!dates[slug]) dates[slug] = current;
}

// A guide added but not yet committed has no git date; fall back to now so it
// is never stamped with something older than it is.
for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith('.json')) continue;
  const slug = path.basename(f, '.json');
  if (!dates[slug]) dates[slug] = new Date().toISOString();
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(dates, null, 2) + '\n');

const years = {};
for (const d of Object.values(dates)) years[d.slice(0, 4)] = (years[d.slice(0, 4)] || 0) + 1;
console.log(`[lastmod] ${Object.keys(dates).length} guides ->`, years);
