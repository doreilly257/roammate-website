/**
 * Converts 458 Astro guide pages in src/pages/guides/ to JSON data files
 * in src/content/guides/. Handles two formats: CityGuideLayout and BackpackerRouteLayout.
 *
 * Usage: npx tsx scripts/convert-guides-to-content.ts [--dry-run]
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const guidesDir = resolve(__dirname, '..', 'src', 'pages', 'guides');
const outDir = resolve(__dirname, '..', 'src', 'content', 'guides');
const dryRun = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function splitFrontmatterAndTemplate(content: string): { frontmatter: string; template: string } {
  const first = content.indexOf('---');
  if (first === -1) throw new Error('No opening --- found');
  const second = content.indexOf('---', first + 3);
  if (second === -1) throw new Error('No closing --- found');

  const frontmatter = content.slice(first + 3, second).trim();
  const template = content.slice(second + 3).trim();
  return { frontmatter, template };
}

function detectType(frontmatter: string): 'city' | 'backpacker' {
  if (frontmatter.includes('BackpackerRouteLayout')) return 'backpacker';
  return 'city';
}

/**
 * Strip import lines from frontmatter, then eval the remaining JS to capture
 * the declared variables (quickFacts, itineraries, budgetTips, etc.).
 */
function evalFrontmatterVars(frontmatter: string): Record<string, unknown> {
  const code = frontmatter
    .split('\n')
    .filter(line => !line.trimStart().startsWith('import '))
    .join('\n');

  const varNames: string[] = [];
  const varRegex = /^const\s+(\w+)\s*=/gm;
  let m: RegExpExecArray | null;
  while ((m = varRegex.exec(code)) !== null) {
    varNames.push(m[1]);
  }

  if (varNames.length === 0) return {};

  const wrapped = `(function() {\n${code}\nreturn { ${varNames.join(', ')} };\n})()`;

  try {
    return eval(wrapped) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`eval failed: ${(err as Error).message}\n--- code excerpt ---\n${wrapped.slice(0, 500)}`);
  }
}

/**
 * Extract props from the layout component invocation in the template.
 * Handles string props (prop="value") and expression props (prop={expr}).
 */
function extractLayoutPropsStr(template: string): string {
  const tagStart = template.search(/<(?:CityGuideLayout|BackpackerRouteLayout)\s/);
  if (tagStart === -1) return '';

  // Find the end of the opening tag, respecting quotes and braces
  let i = template.indexOf(' ', tagStart);
  let inDoubleQuote = false;
  let braceDepth = 0;

  while (i < template.length) {
    const ch = template[i];
    if (inDoubleQuote) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === '"') inDoubleQuote = false;
    } else if (braceDepth > 0) {
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
    } else {
      if (ch === '"') inDoubleQuote = true;
      else if (ch === '{') braceDepth++;
      else if (ch === '/' && template[i + 1] === '>') return template.slice(tagStart, i);
      else if (ch === '>' && braceDepth === 0) return template.slice(tagStart, i);
    }
    i++;
  }
  return template.slice(tagStart);
}

function extractTemplateProps(template: string, varContext: Record<string, unknown>): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  const propsStr = extractLayoutPropsStr(template);
  if (!propsStr) return props;

  // String props: prop="value"
  const stringPropRegex = /(\w+)="([^"]*)"/g;
  let sm: RegExpExecArray | null;
  while ((sm = stringPropRegex.exec(propsStr)) !== null) {
    props[sm[1]] = sm[2];
  }

  // Expression props: prop={expression}
  const exprPropRegex = /(\w+)=\{/g;
  let em: RegExpExecArray | null;
  while ((em = exprPropRegex.exec(propsStr)) !== null) {
    const propName = em[1];
    const startIdx = em.index + em[0].length;

    let depth = 1;
    let i = startIdx;
    while (i < propsStr.length && depth > 0) {
      if (propsStr[i] === '{') depth++;
      else if (propsStr[i] === '}') depth--;
      i++;
    }

    const exprStr = propsStr.slice(startIdx, i - 1).trim();

    if (exprStr in varContext) {
      props[propName] = varContext[exprStr];
    } else {
      try {
        props[propName] = eval(`(${exprStr})`);
      } catch {
        props[propName] = exprStr;
      }
    }
  }

  return props;
}

/**
 * Extract SeasonCalendar months data from backpacker routes that have it.
 */
function extractSeasonCalendar(template: string): unknown[] | null {
  const match = template.match(/<SeasonCalendar[^>]*months=\{(\[[\s\S]*?\])\}\s*\/>/);
  if (!match) return null;

  try {
    return eval(`(${match[1]})`) as unknown[];
  } catch {
    return null;
  }
}

/**
 * Extract structured data (ld+json) from backpacker routes that have it.
 */
function extractStructuredData(template: string): unknown[] | null {
  const match = template.match(/set:html=\{JSON\.stringify\((\[[\s\S]*?\])\)\}/);
  if (!match) return null;

  try {
    return eval(`(${match[1]})`) as unknown[];
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const files = readdirSync(guidesDir).filter(f => f.endsWith('.astro')).sort();
const total = files.length;

if (!dryRun) {
  mkdirSync(outDir, { recursive: true });
}

let processed = 0;
let skipped = 0;
let errors = 0;
const errorDetails: string[] = [];

for (const file of files) {
  const slug = basename(file, '.astro');
  const filePath = resolve(guidesDir, file);

  try {
    const content = readFileSync(filePath, 'utf-8');

    // Skip non-guide pages (e.g. index.astro)
    if (!content.includes('CityGuideLayout') && !content.includes('BackpackerRouteLayout')) {
      skipped++;
      console.log(`[skip] ${slug} — not a guide page`);
      continue;
    }

    const { frontmatter, template } = splitFrontmatterAndTemplate(content);
    const type = detectType(frontmatter);

    const vars = evalFrontmatterVars(frontmatter);
    const templateProps = extractTemplateProps(template, vars);

    const output: Record<string, unknown> = {
      type,
      slug,
      ...vars,
      ...templateProps,
    };

    if (type === 'backpacker') {
      const seasonCalendar = extractSeasonCalendar(template);
      if (seasonCalendar) {
        output.seasonCalendar = seasonCalendar;
      }

      const structuredData = extractStructuredData(template);
      if (structuredData) {
        output.structuredData = structuredData;
      }
    }

    if (dryRun) {
      const propCount = Object.keys(output).length;
      console.log(`[${processed + 1}/${total}] ${slug} (${type}, ${propCount} props) — would create ${slug}.json`);
    } else {
      const json = JSON.stringify(output, null, 2);
      writeFileSync(resolve(outDir, `${slug}.json`), json + '\n');
      console.log(`[${processed + 1}/${total}] ${slug} (${type})`);
    }

    processed++;
  } catch (err) {
    errors++;
    const msg = `ERROR [${processed + errors}/${total}] ${slug}: ${(err as Error).message}`;
    console.error(msg);
    errorDetails.push(msg);
  }
}

const guideTotal = total - skipped;
console.log(`\n${dryRun ? 'Dry run complete' : 'Done'}. Processed: ${processed}/${guideTotal} guides (${skipped} non-guide files skipped). Errors: ${errors}.`);
if (errorDetails.length > 0) {
  console.log('\nError summary:');
  errorDetails.forEach(e => console.log(`  ${e}`));
}
