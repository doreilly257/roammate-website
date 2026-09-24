#!/usr/bin/env node
// Route parity gate: lists every app-facing /v1 route the backend defines and tags
// which client calls it (ios, android, both, none). Exits 1 only on single-platform
// or uncalled routes missing from route-allowlist.json with the same status.
//
// Static and pragmatic: it reads source text, it does not execute anything. A route
// counts as "called" when some client string literal normalises to its path.
// Usage: node tools/parity/route-coverage.mjs [--backend F] [--ios DIR] [--android DIR]
//        [--allowlist F] [--json]

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve, relative, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULTS = {
  backend: "/Users/doreilly/Work/roammate-app-ios/api/src/index.ts",
  ios: "/Users/doreilly/Work/roammate-app-ios/roammate",
  android: "/Users/doreilly/Work/roammate-app-android",
  allowlist: join(HERE, "route-allowlist.json"),
};
const METHODS = ["get", "post", "put", "patch", "delete"];
// Not app-facing: operator console (X-Admin-Key) and provider webhooks.
export const SKIP_PREFIXES = [
  { prefix: "/v1/admin", why: "admin console, X-Admin-Key only" },
  { prefix: "/v1/verification/webhook", why: "identity-provider webhook" },
];
const P = "\u0000"; // interpolation placeholder inside extracted strings

// ---------- helpers ----------

function lineAt(src, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (src.charCodeAt(i) === 10) n++;
  return n;
}

function joinPath(...parts) {
  const segs = parts.flatMap((p) => p.split("/")).filter(Boolean);
  return "/" + segs.join("/");
}

function normSegment(s) {
  if (s === "*") return "*";
  if (s.startsWith(":") || /^\{[^}]*\}$/.test(s) || s.includes(P)) return ":p";
  return s;
}

// Backend full path ("/v1/users/:id") -> normalised key ("v1/users/:p").
export function backendKey(path) {
  return path.split("/").filter(Boolean).map(normSegment).join("/");
}

// Client path (relative to .../v1/, or absolute URL) -> key, or null if not /v1.
export function clientKey(raw) {
  let p = raw.split(/[?#]/)[0];
  if (/^[a-z]+:\/\//.test(p) && !/^(?:https?|wss?):\/\/api\.roammate\.com(\/|$)/.test(p)) return null;
  const url = p.match(/^(?:https?|wss?):\/\/api\.roammate\.com(\/.*)?$/);
  if (url) {
    p = url[1] || "/";
    if (!/^\/v1(\/|$)/.test(p)) return null;
  }
  p = p.replace(/^\/?v1(\/|$)/, "");
  const segs = p.split("/").filter(Boolean).map(normSegment);
  if (!segs.length) return null;
  return ["v1", ...segs].join("/");
}

function matches(routeSegs, callSegs) {
  for (let i = 0; i < routeSegs.length; i++) {
    const r = routeSegs[i];
    if (r === "*") return true;
    const c = callSegs[i];
    if (c === undefined) return false;
    if (r === ":p") continue;
    if (c !== r) return false; // a client param only matches a backend param
  }
  return routeSegs.length === callSegs.length;
}

function walk(dir, ext, skipDir, skipFile, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (!skipDir(name)) walk(full, ext, skipDir, skipFile, out);
    } else if (name.endsWith(ext) && !skipFile(name)) out.push(full);
  }
  return out;
}

// Extracts double-quoted string literals, skipping comments and triple-quoted strings.
// Interpolations (Swift \(x), Kotlin $x / ${x}) become the placeholder P.
export function extractStrings(src, lang) {
  const out = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2); if (i < 0) break; i += 2; continue; }
    if (c === '"' && src.startsWith('"""', i)) { i = src.indexOf('"""', i + 3); if (i < 0) break; i += 3; continue; }
    if (c !== '"') { i++; continue; }
    const start = i;
    let j = i + 1;
    let val = "";
    while (j < n && src[j] !== '"' && src[j] !== "\n") {
      if (src[j] === "\\" && lang === "swift" && src[j + 1] === "(") {
        j = skipBalanced(src, j + 1, "(", ")");
        val += P;
      } else if (src[j] === "\\") {
        val += src[j + 1] ?? "";
        j += 2;
      } else if (lang === "kotlin" && src[j] === "$" && src[j + 1] === "{") {
        j = skipBalanced(src, j + 1, "{", "}");
        val += P;
      } else if (lang === "kotlin" && src[j] === "$" && /[A-Za-z_]/.test(src[j + 1] ?? "")) {
        j++;
        while (j < n && /[A-Za-z0-9_]/.test(src[j])) j++;
        val += P;
      } else val += src[j++];
    }
    out.push({ value: val, start, end: j + 1 });
    i = j + 1;
  }
  return out;
}

// From an opening bracket at `open`, returns the index just past its match.
function skipBalanced(src, open, o, c) {
  let depth = 0;
  let k = open;
  while (k < src.length) {
    const ch = src[k];
    if (ch === '"') {
      k++;
      while (k < src.length && src[k] !== '"') k += src[k] === "\\" ? 2 : 1;
      k++;
      continue;
    }
    if (ch === o) depth++;
    else if (ch === c && --depth === 0) return k + 1;
    k++;
  }
  return k;
}

// ---------- backend ----------

export function parseBackend(indexPath) {
  const src = readFileSync(indexPath, "utf8");
  const baseDir = dirname(indexPath);
  const imports = new Map(); // ident -> module file
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'](\.[^"']+)["']/g)) {
    const file = resolveModule(baseDir, m[2]);
    if (!file) continue;
    for (const name of m[1].split(",")) {
      const id = name.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop().trim();
      if (id) imports.set(id, file);
    }
  }
  const appMount = src.match(/(\w+)\.route\(\s*["'`]\/v1["'`]\s*,\s*(\w+)\s*\)/);
  if (!appMount) throw new Error(`no app.route("/v1", ...) in ${indexPath}`);
  const [, appVar, v1Var] = appMount;

  const routes = [];
  const skipped = new Map(SKIP_PREFIXES.map((s) => [s.prefix, { ...s, count: 0 }]));
  let outOfScope = 0;
  const warnings = [];
  const fileCache = new Map();
  const add = (method, path, file, line) => {
    const hit = SKIP_PREFIXES.find((s) => path === s.prefix || path.startsWith(s.prefix + "/"));
    if (hit) { skipped.get(hit.prefix).count++; return; }
    routes.push({ method: method.toUpperCase(), path, key: backendKey(path), file, line });
  };
  const handlersOf = (ident, mount) => {
    const file = imports.get(ident) ?? indexPath;
    if (!fileCache.has(file)) fileCache.set(file, readFileSync(file, "utf8"));
    const w = [];
    const hs = routerHandlers(fileCache.get(file), ident, w, file).map((h) => ({ ...h, file }));
    // A nested mount under a skipped prefix needs no warning.
    if (!SKIP_PREFIXES.some((s) => joinPath("/v1", mount).startsWith(s.prefix))) warnings.push(...w);
    return hs;
  };

  // v1.<method>("/path") in index.ts, then every v1.route(mount, router).
  for (const h of routerHandlers(src, v1Var, [], indexPath)) add(h.method, joinPath("/v1", h.path), indexPath, h.line);
  for (const m of src.matchAll(new RegExp(`\\b${v1Var}\\.route\\(\\s*["'\`]([^"'\`]*)["'\`]\\s*,\\s*(\\w+)\\s*\\)`, "g"))) {
    const [, mount, ident] = m;
    if (!imports.has(ident)) { warnings.push(`router ${ident} (mounted at ${mount}) not resolved to a file`); continue; }
    for (const h of handlersOf(ident, mount)) add(h.method, joinPath("/v1", mount, h.path), h.file, h.line);
  }
  // Routes on the app itself are out of scope; count them.
  outOfScope += routerHandlers(src, appVar, [], indexPath).length;
  for (const m of src.matchAll(new RegExp(`\\b${appVar}\\.route\\(\\s*["'\`]([^"'\`]*)["'\`]\\s*,\\s*(\\w+)\\s*\\)`, "g"))) {
    if (m[2] === v1Var || !imports.has(m[2])) continue;
    outOfScope += handlersOf(m[2], "/__out_of_scope").length;
  }
  return { routes, skipped: [...skipped.values()], outOfScope, warnings };
}

function resolveModule(baseDir, spec) {
  for (const cand of [spec + ".ts", spec + ".js", join(spec, "index.ts"), spec]) {
    const f = resolve(baseDir, cand);
    if (existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
}

const CHAIN_RE = /^\s*\.\s*(get|post|put|patch|delete)\s*\(\s*(["'`])([^"'`]*)\2/;

// Handlers registered on `ident`: ident.get("/p", ...), plus chained ).post("/p", ...).
export function routerHandlers(src, ident, warnings, file) {
  const out = [];
  const direct = new RegExp(`\\b${ident}\\s*\\.\\s*(${METHODS.join("|")})\\s*\\(\\s*(["'\`])([^"'\`]*)\\2`, "g");
  for (const m of src.matchAll(direct)) {
    out.push({ method: m[1], path: m[3], line: lineAt(src, m.index) });
    let end = skipBalanced(src, src.indexOf("(", m.index + m[0].indexOf(m[1])), "(", ")");
    for (;;) {
      // CHAIN_RE is anchored, so it only ever matches what immediately follows.
      const chain = src.slice(end).match(CHAIN_RE);
      if (!chain) break;
      const at = end + chain[0].indexOf(chain[1]);
      out.push({ method: chain[1], path: chain[3], line: lineAt(src, at) });
      end = skipBalanced(src, src.indexOf("(", at), "(", ")");
    }
  }
  for (const m of src.matchAll(new RegExp(`\\b${ident}\\.route\\(\\s*["'\`]([^"'\`]*)`, "g"))) {
    warnings.push(`nested mount ${ident}.route("${m[1]}") in ${basename(file)} not followed`);
  }
  return out;
}

// ---------- clients ----------

function acceptable(raw, firstSegs) {
  if (/\s/.test(raw) || !raw.includes("/")) return false;
  if (/^(?:https?|wss?):\/\//.test(raw)) return /^(?:https?|wss?):\/\/api\.roammate\.com\/v1(\/|$)/.test(raw);
  const rel = raw.replace(/^\/?v1\//, "").replace(/^\//, "");
  const first = rel.split(/[/?#]/)[0];
  return firstSegs.has(first);
}

// Swift: string literals whose first segment is a backend first segment.
export function scanSwift(root, firstSegs) {
  const skipDir = (name) => /Tests?$/.test(name) || [".tmp", "build", "DerivedData", ".claude", ".build", "Pods"].includes(name);
  const skipFile = (name) => /Tests?\.swift$|UITest|UnitTest|Mock|Stub/.test(name);
  const calls = [];
  const unresolved = [];
  for (const file of walk(root, ".swift", skipDir, skipFile)) {
    const src = readFileSync(file, "utf8");
    for (const s of extractStrings(src, "swift")) {
      if (!acceptable(s.value, firstSegs)) continue;
      const loc = { file, line: lineAt(src, s.start) };
      const lineText = src.slice(src.lastIndexOf("\n", s.start) + 1, src.indexOf("\n", s.start));
      // Path prefixes used for matching, not requests: cache invalidation, hasPrefix()
      // checks, and ("/prefix", ttl) cache tables.
      if (/invalidat/i.test(lineText)) continue;
      if (/(hasPrefix|hasSuffix|contains|starts?With)\(\s*$/.test(src.slice(s.start - 40, s.start))) continue;
      if (/^\s*,\s*[\d.]+\s*\)/.test(src.slice(s.end, s.end + 30))) continue;
      let raw = s.value;
      if (/^\s*\+/.test(src.slice(s.end, s.end + 20))) {
        if (!raw.endsWith("/")) { unresolved.push({ ...loc, raw }); continue; }
        raw += P; // "/users/" + id
      }
      const key = clientKey(raw);
      if (key) calls.push({ ...loc, raw: s.value, key, method: swiftMethod(src, s.start) });
    }
  }
  return { calls, unresolved };
}

// Method from the enclosing Endpoint(...) call; GET is Endpoint's default. null = unknown.
function swiftMethod(src, at) {
  const open = src.lastIndexOf("Endpoint(", at);
  if (open < 0 || at - open > 400) return null;
  const close = skipBalanced(src, open + "Endpoint".length, "(", ")");
  if (close < at) return null;
  const m = src.slice(open, close).match(/method:\s*\.(\w+)/);
  return m ? m[1].toUpperCase() : "GET";
}

// Kotlin: Retrofit annotations, plus any literal "v1/..." or api.roammate.com/v1 URL.
export function scanKotlin(root, firstSegs) {
  const skipDir = (name) => ["build", ".claude", ".gradle", "test", "androidTest", "testFixtures", "node_modules", "vendor", ".git"].includes(name);
  const calls = [];
  const unresolved = [];
  for (const file of walk(root, ".kt", skipDir, () => false)) {
    const src = readFileSync(file, "utf8");
    const annotated = new Set();
    const push = (index, path, method) => {
      annotated.add(src.indexOf('"', index));
      const loc = { file, line: lineAt(src, index), raw: path };
      if (/^(?:https?|wss?):\/\//.test(path) && !/api\.roammate\.com\/v1/.test(path)) return;
      const key = clientKey(path.replace(/^\//, "")); // Retrofit paths resolve against .../v1/
      if (key) calls.push({ ...loc, key, method: method ? method.toUpperCase() : null });
      else unresolved.push(loc);
    };
    for (const m of src.matchAll(/@(GET|POST|PUT|PATCH|DELETE)\s*\(\s*(?:value\s*=\s*)?"([^"]*)"/g)) {
      if (!isCommented(src, m.index)) push(m.index, m[2], m[1]);
    }
    for (const m of src.matchAll(/@HTTP\s*\(([^)]*)\)/g)) {
      if (isCommented(src, m.index)) continue;
      const method = m[1].match(/method\s*=\s*"(\w+)"/)?.[1];
      const path = m[1].match(/path\s*=\s*"([^"]*)"/)?.[1];
      if (path !== undefined) push(m.index, path, method ?? null);
    }
    for (const s of extractStrings(src, "kotlin")) {
      if (annotated.has(s.start)) continue;
      if (!/^(\/?v1\/|(?:https?|wss?):\/\/api\.roammate\.com\/v1(\/|$))/.test(s.value)) continue;
      if (!acceptable(s.value, firstSegs)) continue;
      const key = clientKey(s.value);
      if (key) calls.push({ file, line: lineAt(src, s.start), raw: s.value, key, method: s.value.startsWith("ws") ? "GET" : null });
    }
  }
  return { calls, unresolved };
}

function isCommented(src, idx) {
  const prefix = src.slice(src.lastIndexOf("\n", idx) + 1, idx).trim();
  return prefix.startsWith("//") || prefix.startsWith("*") || prefix.startsWith("/*");
}

// ---------- classification ----------

export function classify(backend, clients) {
  const paths = new Map(); // key -> entry
  for (const r of backend.routes) {
    if (!paths.has(r.key)) paths.set(r.key, { route: r.path, key: r.key, segs: r.key.split("/"), methods: new Set(), defs: [], ios: [], android: [] });
    const e = paths.get(r.key);
    e.methods.add(r.method);
    e.defs.push({ method: r.method, file: r.file, line: r.line });
  }
  const entries = [...paths.values()];
  const unmatched = { ios: [], android: [] };
  // Most specific wins: fewest params, wildcards last.
  const score = (e) => e.segs.filter((s) => s === ":p").length * 2 + (e.segs.includes("*") ? 100 : 0);
  for (const platform of ["ios", "android"]) {
    for (const call of clients[platform].calls) {
      const segs = call.key.split("/");
      const hits = entries.filter((e) => matches(e.segs, segs));
      if (!hits.length) { unmatched[platform].push(call); continue; }
      const best = Math.min(...hits.map(score));
      for (const e of hits) if (score(e) === best) e[platform].push(call);
    }
  }
  for (const e of entries) {
    e.tag = e.ios.length && e.android.length ? "both" : e.ios.length ? "ios-only" : e.android.length ? "android-only" : "none";
    e.methodWarnings = methodWarnings(e);
  }
  entries.sort((a, b) => a.route.localeCompare(b.route));
  return { entries, unmatched };
}

function methodWarnings(e) {
  const out = [];
  for (const platform of ["ios", "android"]) {
    for (const c of e[platform]) {
      if (c.method && !e.methods.has(c.method)) out.push(`${platform} calls ${c.method} ${e.route}, backend defines ${[...e.methods].join("/")} (${rel(c)})`);
    }
  }
  if (e.tag === "none") return out;
  for (const m of e.methods) {
    const by = ["ios", "android"].filter((p) => e[p].some((c) => c.method === m));
    // A platform with an unknown-method call to this path might be the caller; don't guess.
    const missing = ["ios", "android"].filter((p) => !by.includes(p) && !e[p].some((c) => !c.method));
    if (missing.length === 2) out.push(`${m} ${e.route}: path is called, but not with ${m} by either client`);
    else if (missing.length === 1 && by.length) out.push(`${m} ${e.route}: only ${by[0]} calls it with ${m}`);
  }
  return out;
}

export function evaluate(entries, allowlist) {
  const allowed = new Map();
  const failures = [];
  const stale = [];
  for (const a of allowlist) {
    const k = backendKey(a.route);
    const prev = allowed.get(k);
    if (prev) failures.push({ route: a.route, tag: "duplicate", fix: `allowlist has both "${prev.route}" and "${a.route}", which name the same route; keep one` });
    else allowed.set(k, a);
  }
  for (const e of entries) {
    const a = allowed.get(e.key);
    if (e.tag === "both") {
      if (a) stale.push({ route: a.route, status: a.status, why: "route is now called by both apps; remove the entry" });
      continue;
    }
    if (!a) {
      const entry = { route: e.route, status: e.tag, reason: "<why>", bead: "<bead-id>" };
      failures.push({ route: e.route, tag: e.tag, fix: `add to route-allowlist.json: ${JSON.stringify(entry)}, or make the ${missingPlatforms(e.tag)} call it` });
    } else if (a.status !== e.tag) {
      failures.push({ route: e.route, tag: e.tag, fix: `allowlist says "${a.status}" but the route is now "${e.tag}": change the entry's status to "${e.tag}" (and its reason), or restore the missing call` });
    }
  }
  const keys = new Set(entries.map((e) => e.key));
  for (const a of allowlist) {
    if (!keys.has(backendKey(a.route))) stale.push({ route: a.route, status: a.status, why: "route no longer defined by the backend; remove the entry" });
  }
  return { failures, stale };
}

function missingPlatforms(tag) {
  return tag === "ios-only" ? "Android app" : tag === "android-only" ? "iOS app" : "iOS and Android apps";
}

// ---------- output ----------

let ROOTS = [];
function rel(loc) {
  const root = ROOTS.find((r) => loc.file.startsWith(r + "/"));
  return `${root ? join(basename(root), relative(root, loc.file)) : loc.file}:${loc.line}`;
}

function evidence(calls) {
  const first = `${rel(calls[0])}${calls[0].method ? ` (${calls[0].method})` : ""}`;
  return calls.length > 1 ? `${first} (+${calls.length - 1} more)` : first;
}

const TAGS = ["both", "ios-only", "android-only", "none"];

function markdown(result) {
  const { entries, backend, evaluation, unmatched, clients } = result;
  const count = (t) => entries.filter((e) => e.tag === t).length;
  const allowedKeys = new Set(result.allowlist.map((a) => `${backendKey(a.route)}|${a.status}`));
  const L = [];
  L.push("# /v1 route coverage (iOS vs Android)", "");
  L.push("|Tag|Paths|", "|-|-|");
  for (const t of TAGS) L.push(`|${t}|${count(t)}|`);
  L.push(`|total|${entries.length} paths (${backend.routes.length} method+path handlers)|`, "");
  L.push("Skipped mounts (not app-facing):");
  for (const s of backend.skipped) L.push(`- ${s.prefix}: ${s.count} handlers (${s.why})`);
  L.push(`- Out of scope: ${backend.outOfScope} handlers mounted on the app outside /v1`, "");
  L.push(`Client call sites matched to /v1 paths: ios ${clients.ios.calls.length}, android ${clients.android.calls.length}.`, "");
  for (const [tag, col] of [["ios-only", "ios"], ["android-only", "android"], ["none", null]]) {
    const list = entries.filter((e) => e.tag === tag);
    L.push(`## ${tag} (${list.length})`, "");
    if (!list.length) { L.push("None.", ""); continue; }
    L.push(`|Route|Methods|${col ? "Proof" : "Defined at"}|Allowlisted|`, "|-|-|-|-|");
    for (const e of list) {
      const proof = col ? evidence(e[col]) : rel(e.defs[0]);
      L.push(`|${e.route}|${[...e.methods].join(",")}|${proof}|${allowedKeys.has(`${e.key}|${tag}`) ? "yes" : "NO"}|`);
    }
    L.push("");
  }
  const mw = entries.flatMap((e) => e.methodWarnings);
  L.push(`## Method warnings (${mw.length}, informational)`, "");
  for (const w of mw) L.push(`- ${w}`);
  L.push("");
  const um = [...unmatched.ios.map((c) => ["ios", c]), ...unmatched.android.map((c) => ["android", c])];
  L.push(`## Client paths matching no backend route (${um.length}, informational)`, "");
  for (const [p, c] of um) L.push(`- ${p}: "${c.raw.replaceAll(P, "{}")}" ${rel(c)}`);
  L.push("");
  if (backend.warnings.length) {
    L.push("## Parser warnings", "");
    for (const w of backend.warnings) L.push(`- ${w}`);
    L.push("");
  }
  if (evaluation.stale.length) {
    L.push(`## Stale allowlist entries (${evaluation.stale.length}, not failing)`, "");
    for (const s of evaluation.stale) L.push(`- ${s.route} [${s.status}]: ${s.why}`);
    L.push("");
  }
  L.push(evaluation.failures.length
    ? `## FAIL: ${evaluation.failures.length} route(s) need action`
    : "## PASS: every single-platform or uncalled route is allowlisted with its current status", "");
  for (const f of evaluation.failures) L.push(`- ${f.route} (${f.tag}): ${f.fix}`);
  return L.join("\n");
}

function toJson(result) {
  const { entries, backend, evaluation, unmatched } = result;
  const call = (c) => ({ at: rel(c), method: c.method, raw: c.raw.replaceAll(P, "{}") });
  return {
    summary: Object.fromEntries(TAGS.map((t) => [t, entries.filter((e) => e.tag === t).length])),
    skipped: backend.skipped.map(({ prefix, count, why }) => ({ prefix, count, why })),
    outOfScope: backend.outOfScope,
    routes: entries.map((e) => ({
      route: e.route, methods: [...e.methods], tag: e.tag, definedAt: rel(e.defs[0]),
      ios: e.ios.map(call), android: e.android.map(call), methodWarnings: e.methodWarnings,
    })),
    unmatched: { ios: unmatched.ios.map(call), android: unmatched.android.map(call) },
    parserWarnings: backend.warnings,
    stale: evaluation.stale,
    failures: evaluation.failures,
    ok: evaluation.failures.length === 0,
  };
}

// ---------- main ----------

export function run(opts) {
  ROOTS = [dirname(opts.backend), opts.ios, opts.android].map((p) => resolve(p));
  const backend = parseBackend(opts.backend);
  const firstSegs = new Set(backend.routes.map((r) => r.key.split("/")[1]).filter((s) => s && s !== ":p" && s !== "*"));
  const clients = { ios: scanSwift(opts.ios, firstSegs), android: scanKotlin(opts.android, firstSegs) };
  const { entries, unmatched } = classify(backend, clients);
  const allowlist = opts.allowlistData ?? JSON.parse(readFileSync(opts.allowlist, "utf8"));
  const evaluation = evaluate(entries, allowlist);
  // Structure the parser could not follow means routes it never saw, so it must fail,
  // not warn: a silent skip would let an unchecked route pass the gate.
  for (const w of backend.warnings) {
    evaluation.failures.push({ route: "(backend parser)", tag: "unparsed", fix: `${w}: teach the parser this shape, or add its prefix to SKIP_PREFIXES with a reason` });
  }
  return { backend, clients, entries, unmatched, allowlist, evaluation };
}

export { markdown, toJson };

function parseArgs(argv) {
  const opts = { ...DEFAULTS, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (["--backend", "--ios", "--android", "--allowlist"].includes(a) && argv[i + 1]) opts[a.slice(2)] = argv[++i];
    else throw new Error(`unknown or incomplete argument: ${a}`);
  }
  return opts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    const result = run(opts);
    console.log(opts.json ? JSON.stringify(toJson(result), null, 2) : markdown(result));
    // exitCode, not exit(): exit() truncates piped stdout past 64 KB.
    process.exitCode = result.evaluation.failures.length ? 1 : 0;
  } catch (err) {
    console.error(`route-coverage: ${err.message}`);
    process.exitCode = 2;
  }
}
