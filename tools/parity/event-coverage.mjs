#!/usr/bin/env node
// Analytics parity gate: iOS and Android keep analytics parity from ONE contract
// (analytics-events.json, Daniel 2026-09-24). Four checks, each failure names its fix:
//   1. the iOS and Android contract copies are byte-identical;
//   2. every event not declared for both platforms is allowlisted with that platform set;
//   3. every event declared for a platform has a call site there (or is allowlisted
//      as not_yet_instrumented);
//   4. every name emitted in code is declared in the contract for that platform (or is
//      allowlisted as undeclared).
// Exits 0 on pass, 1 on any failure, 2 when an input cannot be read or parsed.
//
// Static and pragmatic: it reads source text, it does not execute anything. Anything it
// cannot follow FAILS rather than warns, because a skipped call site is an event nobody
// checked. How a call site's name is found, in order:
//   - a string literal, or an event constant (Swift `static let`, Kotlin `const val`
//     under AnalyticsEvents / Journeys), resolved to its string;
//   - a parameter of the enclosing function: every caller's argument is resolved instead;
//   - a local (`let/val/var x = ...`, `for x in ...`, `xs.forEach { x -> ... }`): the
//     event constants and literals in its initialiser, plus those in the body of any
//     app function the initialiser calls (one level);
//   - a closure parameter: if the closure IS a sink (bound to `capture`,
//     `analyticsSink` or CaptureHandler, whose own calls are scanned as emitters) it is a
//     forwarder, otherwise every call of the closure's name is resolved;
//   - the body of a function named `capture` forwarding its own parameter is the sink
//     itself, not an emission.
// Journey rule: JourneyAttempt builds `<journey>_<outcome>` from its argument, so the
// interpolated literals inside JourneyAttempt.swift / JourneyAttempt.kt are resolved from
// the helper's CALLERS instead. Each `JourneyAttempt.start(J)` emits J_started. An outcome
// (J_completed / _failed / _cancelled) counts as emitted only when the variable the start
// is bound to has `.completed(` / `.failed(` / `.cancelled(` called on it in the same file.
// Names starting with `$` are PostHog built-ins ($exception, $screen) and are not checked.
//
// Usage: node tools/parity/event-coverage.mjs [--ios-contract F] [--android-contract F]
//        [--ios DIR] [--android DIR] [--allowlist F] [--json]

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, relative, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULTS = {
  iosContract: "/Users/doreilly/Work/roammate-app-ios/analytics-events.json",
  androidContract: "/Users/doreilly/Work/roammate-app-android/analytics-events.json",
  ios: "/Users/doreilly/Work/roammate-app-ios/roammate",
  android: "/Users/doreilly/Work/roammate-app-android",
  allowlist: join(HERE, "event-allowlist.json"),
};
const PLATFORMS = ["ios", "android"];
const OUTCOMES = ["completed", "failed", "cancelled"];
const NAMESPACES = new Set(["AnalyticsEvents", "Journeys"]);
const P = "\u0000"; // interpolation placeholder inside extracted strings
const MAX_DEPTH = 6;

// Per-language knobs. `emitters` are calls whose first (or `type =` / `event =`) argument is
// an event name sent to PostHog. `sinkNames` are closure bindings whose invocations are
// themselves emitters, so a closure bound to one of them only forwards.
const LANG = {
  ios: {
    ext: ".swift",
    lang: "swift",
    skipDir: (n) => /Tests?$/.test(n) || [".tmp", "build", "DerivedData", ".claude", ".build", "Pods"].includes(n),
    skipFile: (n) => /Tests?\.swift$|UITest|UnitTest|Mock|Stub/.test(n),
    emitters: [
      /\bAnalyticsService\s*\.\s*shared\s*\.\s*capture\s*\(/g,
      /\bPostHogSDK\s*\.\s*shared\s*\.\s*capture\s*\(/g,
      /(?<![\w.])(?:self\s*\.\s*)?analyticsSink\s*\(/g,
    ],
    sinkNames: new Set(["analyticsSink"]),
    journeyHelper: "JourneyAttempt.swift",
  },
  android: {
    ext: ".kt",
    lang: "kotlin",
    skipDir: (n) => ["build", ".claude", ".gradle", "test", "androidTest", "testFixtures", "node_modules", "vendor", ".git", ".tmp"].includes(n),
    // Test helpers can live under src/main; credit them and fake events count as real.
    skipFile: (n) => /Tests?\.kt$|Test(Helper|Utils?|Support)\w*\.kt$|Mock|Stub|Fake/.test(n),
    emitters: [
      /\bAnalyticsBridge\s*\.\s*capture\s*\(/g,
      /(?<![\w.])Analytics\s*\.\s*capture\s*\(/g,
      /\bPostHog\s*\.\s*capture\s*\(/g,
      /\b\w+\s*\?\.\s*capture\s*\(/g,
      /(?<![\w.?])capture\s*\(/g,
    ],
    sinkNames: new Set(["capture", "CaptureHandler"]),
    journeyHelper: "JourneyAttempt.kt",
  },
};

// ---------- helpers ----------

function lineAt(src, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (src.charCodeAt(i) === 10) n++;
  return n;
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

// Returns `code` (comments and string contents blanked, newlines and quotes kept, so
// brackets and commas can be counted naively) and every string literal found.
export function tokenize(src, lang) {
  const code = src.split("");
  const strings = [];
  const n = src.length;
  const blank = (a, b) => { for (let k = a; k < b && k < n; k++) if (code[k] !== "\n") code[k] = " "; };
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") {
      const e = src.indexOf("\n", i);
      blank(i, e < 0 ? n : e);
      i = e < 0 ? n : e;
    } else if (c === "/" && src[i + 1] === "*") {
      let depth = 1;
      let k = i + 2;
      while (k < n && depth) {
        if (src.startsWith("/*", k)) { depth++; k += 2; } else if (src.startsWith("*/", k)) { depth--; k += 2; } else k++;
      }
      blank(i, k);
      i = k;
    } else if (lang === "kotlin" && c === "'") {
      const k = src[i + 1] === "\\" ? src.indexOf("'", i + 3) : i + 2;
      blank(i + 1, k);
      i = k + 1;
    } else if (c === '"' || (lang === "swift" && c === "#" && src[i + 1] === '"')) {
      const s = readString(src, i, lang);
      strings.push(s);
      blank(s.start + 1, s.end - 1);
      i = s.end;
    } else i++;
  }
  return { code: code.join(""), strings };
}

function readString(src, start, lang) {
  const n = src.length;
  if (src[start] === "#") {
    const e = src.indexOf('"#', start + 2);
    const end = e < 0 ? n : e + 2;
    return { start, end, value: src.slice(start + 2, end - 2), raw: src.slice(start, end), interpolated: false };
  }
  if (src.startsWith('"""', start)) {
    const e = src.indexOf('"""', start + 3);
    const end = e < 0 ? n : e + 3;
    const raw = src.slice(start, end);
    return { start, end, value: raw.slice(3, -3), raw, interpolated: /\\\(|\$\{|\$[A-Za-z_]/.test(raw) };
  }
  let j = start + 1;
  let val = "";
  let interpolated = false;
  while (j < n && src[j] !== '"' && src[j] !== "\n") {
    if (src[j] === "\\" && lang === "swift" && src[j + 1] === "(") {
      j = skipInterp(src, j + 1, "(", ")", lang);
      val += P;
      interpolated = true;
    } else if (src[j] === "\\") {
      val += src[j + 1] ?? "";
      j += 2;
    } else if (lang === "kotlin" && src[j] === "$" && src[j + 1] === "{") {
      j = skipInterp(src, j + 1, "{", "}", lang);
      val += P;
      interpolated = true;
    } else if (lang === "kotlin" && src[j] === "$" && /[A-Za-z_]/.test(src[j + 1] ?? "")) {
      j++;
      while (j < n && /\w/.test(src[j])) j++;
      val += P;
      interpolated = true;
    } else val += src[j++];
  }
  const end = Math.min(j + 1, n);
  return { start, end, value: val, raw: src.slice(start, end), interpolated };
}

// From an opening bracket inside an interpolation, returns the index just past its match.
function skipInterp(src, open, o, c, lang) {
  let depth = 0;
  let k = open;
  while (k < src.length) {
    const ch = src[k];
    if (ch === '"') { k = readString(src, k, lang).end; continue; }
    if (ch === o) depth++;
    else if (ch === c && --depth === 0) return k + 1;
    k++;
  }
  return k;
}

const PAIRS = { "(": ")", "[": "]", "{": "}" };

// Index just past the bracket matching code[open]. Strings are blanked, so counting is safe.
function matchClose(code, open) {
  const o = code[open];
  const c = PAIRS[o];
  let depth = 0;
  for (let k = open; k < code.length; k++) {
    if (code[k] === o) depth++;
    else if (code[k] === c && --depth === 0) return k + 1;
  }
  return code.length;
}

// Top-level comma-separated segments between code[open] = "(" and its match.
function splitArgs(code, open) {
  const close = matchClose(code, open) - 1;
  const out = [];
  let depth = 0;
  let segStart = open + 1;
  for (let k = open + 1; k < close; k++) {
    const ch = code[k];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (ch === "," && depth === 0) { out.push(trimSeg(code, segStart, k)); segStart = k + 1; }
  }
  if (code.slice(segStart, close).trim()) out.push(trimSeg(code, segStart, close));
  return out;
}

function trimSeg(code, a, b) {
  while (a < b && /\s/.test(code[a])) a++;
  while (b > a && /\s/.test(code[b - 1])) b--;
  return { start: a, end: b };
}

// ---------- per-file model ----------

const DECL_RE = {
  swift: /\b(enum|struct|class|extension|actor|protocol)\s+([A-Za-z_][\w.]*)/g,
  kotlin: /\b(object|class|interface)\s+([A-Za-z_]\w*)/g,
};
const CONST_RE = {
  swift: /\bstatic\s+let\s+(\w+)\s*(?::\s*String\s*)?=\s*(?=["#])/g,
  kotlin: /\bconst\s+val\s+(\w+)\s*(?::\s*String\s*)?=\s*(?=")/g,
};
const FUNC_RE = /\b(func|fun)\s+(?:<[^>]*>\s*)?(?:[\w.]+\.)?(`?\w+`?)\s*(?:<[^>]*>)?\s*\(/g;

function loadFile(file, platform) {
  const src = readFileSync(file, "utf8");
  const lang = LANG[platform].lang;
  const { code, strings } = tokenize(src, lang);
  const byStart = new Map(strings.map((s) => [s.start, s]));
  const scopes = [];
  for (const m of code.matchAll(DECL_RE[lang])) {
    const open = bodyOpen(code, m.index + m[0].length);
    if (open >= 0) scopes.push({ name: m[2], start: open, end: matchClose(code, open) });
  }
  const funcs = [];
  for (const m of code.matchAll(FUNC_RE)) {
    const paren = m.index + m[0].length - 1;
    const pclose = matchClose(code, paren);
    const body = funcBody(code, pclose);
    const lineStart = code.lastIndexOf("\n", m.index) + 1;
    funcs.push({
      name: m[2].replaceAll("`", ""),
      at: m.index,
      params: parseParams(code, paren, lang),
      bodyStart: body ? body.start : -1,
      bodyEnd: body ? body.end : -1,
      isPrivate: /\b(private|fileprivate)\b/.test(code.slice(lineStart, m.index)),
      file,
    });
  }
  return { file, platform, lang, src, code, strings, byStart, scopes, funcs };
}

// The `{` opening a declaration body, or -1 when it has none (e.g. `class X` in a comment
// already blanked, or a protocol requirement). Skips constructor parameter lists.
function bodyOpen(code, from) {
  let k = from;
  while (k < code.length) {
    const ch = code[k];
    if (ch === "{") return k;
    if (ch === "(") { k = matchClose(code, k); continue; }
    if (ch === "}" || ch === ";" || ch === "=") return -1;
    if (ch === "\n") {
      const prev = code.slice(Math.max(0, k - 200), k).trimEnd();
      const next = code.slice(k).match(/^\s*(\S)/)?.[1];
      if (!/[,:(<]$/.test(prev) && !["{", ":", ",", "(", "w"].includes(next)) return -1;
    }
    k++;
  }
  return -1;
}

// Function body after its parameter list: a `{...}` block, a Kotlin `= expr` body, or null.
function funcBody(code, from) {
  let k = from;
  let depth = 0;
  while (k < code.length) {
    const ch = code[k];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && ch === "{") return { start: k, end: matchClose(code, k) };
    else if (depth === 0 && ch === "=" && code[k + 1] !== "=" && code[k - 1] !== "!" && code[k - 1] !== "<" && code[k - 1] !== ">") {
      return { start: k + 1, end: statementEnd(code, k + 1) };
    } else if (depth === 0 && (ch === "}" || ch === ";")) return null;
    else if (depth === 0 && ch === "\n") {
      const next = code.slice(k).match(/^\s*(\S+)/)?.[1] ?? "";
      if (!/^(\{|->|=|:|where|throws|rethrows|async)/.test(next)) return null;
    }
    k++;
  }
  return null;
}

// End of the expression starting at `from`: the first newline at bracket depth 0 that is
// not followed by a continuation line.
function statementEnd(code, from) {
  let depth = 0;
  for (let k = from; k < code.length; k++) {
    const ch = code[k];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") { if (--depth < 0) return k; }
    else if (ch === "\n" && depth === 0 && code.slice(from, k).trim()) {
      const next = code.slice(k).match(/^\s*(\S)/)?.[1];
      if (next !== "." && next !== "?" && next !== ":") return k;
    }
  }
  return code.length;
}

function parseParams(code, open, lang) {
  const segs = splitArgs(code, open);
  return segs.map((s, index) => {
    let t = code.slice(s.start, s.end).replace(/@\w+(\([^)]*\))?/g, " ").trim();
    t = t.replace(/^(?:(?:private|public|internal|protected|override|val|var|vararg|noinline|crossinline|inout)\s+)+/, "");
    const head = t.split(":")[0].trim().split(/\s+/);
    if (lang === "swift") return { index, label: head[0], name: head[head.length - 1] };
    return { index, label: head[0], name: head[0] };
  });
}

function scopesAt(fm, pos) {
  return fm.scopes.filter((s) => s.start < pos && pos < s.end).sort((a, b) => a.start - b.start).flatMap((s) => s.name.split("."));
}

function enclosingFunc(fm, pos) {
  let best = null;
  for (const f of fm.funcs) {
    if (f.bodyStart < pos && pos < f.bodyEnd && (!best || f.bodyStart > best.bodyStart)) best = f;
  }
  return best;
}

// Enclosing `{` positions, innermost first, stopping at `limit`.
function enclosingBraces(code, pos, limit) {
  const out = [];
  let depth = 0;
  for (let k = pos - 1; k > limit; k--) {
    const ch = code[k];
    if (ch === "}") depth++;
    else if (ch === "{") {
      if (depth === 0) out.push(k);
      else depth--;
    }
  }
  return out;
}

// Parameter names of a closure opening at code[brace], or null when it declares none.
function closureParams(code, brace, lang) {
  const after = code.slice(brace + 1, brace + 200);
  if (lang === "swift") {
    const m = after.match(/^\s*(?:\[[^\]]*\]\s*)?\(?\s*(\w+(?:\s*:\s*[^,)]+)?(?:\s*,\s*\w+(?:\s*:\s*[^,)]+)?)*)\s*\)?\s*(?:->\s*[^{]*?)?\s*in\b/);
    return m ? m[1].split(",").map((p) => p.split(":")[0].trim()) : null;
  }
  const m = after.match(/^\s*([\w\s,:<>?]+?)\s*->/);
  return m ? m[1].split(",").map((p) => p.split(":")[0].trim()) : null;
}

// ---------- model over a platform ----------

export function loadPlatform(root, platform) {
  const cfg = LANG[platform];
  const files = walk(root, cfg.ext, cfg.skipDir, cfg.skipFile).map((f) => loadFile(f, platform));
  const constants = new Map(); // "AnalyticsEvents.Onboarding.started" -> { value, file, line }
  for (const fm of files) {
    for (const m of fm.code.matchAll(CONST_RE[fm.lang])) {
      const s = fm.byStart.get(m.index + m[0].length);
      if (!s || s.interpolated) continue;
      const key = [...scopesAt(fm, m.index), m[1]].join(".");
      constants.set(key, { value: s.value, file: fm.file, line: lineAt(fm.src, m.index) });
    }
  }
  const funcsByName = new Map();
  for (const fm of files) for (const f of fm.funcs) {
    if (!funcsByName.has(f.name)) funcsByName.set(f.name, []);
    funcsByName.get(f.name).push({ ...f, fm });
  }
  return { platform, root, files, constants, funcsByName, callCache: new Map() };
}

// Resolves a dotted path to an event constant under an event namespace, or null.
function resolveConst(model, fm, pos, path) {
  const segs = path.split(".");
  const firstType = segs.findIndex((s) => /^[A-Z]/.test(s));
  if (firstType > 0) segs.splice(0, firstType); // Kotlin fully-qualified reference
  const candidates = [];
  const scopes = scopesAt(fm, pos);
  for (let i = scopes.length; i >= 0; i--) candidates.push([...scopes.slice(0, i), ...segs].join("."));
  for (const key of candidates) {
    const hit = model.constants.get(key);
    if (hit && NAMESPACES.has(key.split(".")[0])) return { key, ...hit };
  }
  return null;
}

// Event constants and event-shaped literals inside code[a..b].
function namesIn(model, fm, a, b) {
  const out = [];
  const text = fm.code.slice(a, b);
  for (const m of text.matchAll(/(?<![\w.])[A-Za-z_]\w*(?:\s*\.\s*[A-Za-z_]\w*)*/g)) {
    const at = a + m.index;
    const c = resolveConst(model, fm, at, m[0].replace(/\s+/g, ""));
    if (c) out.push({ name: c.value, file: fm.file, line: lineAt(fm.src, at), via: c.key });
  }
  for (const s of fm.strings) {
    if (s.start >= a && s.end <= b && !s.interpolated && /^[a-z][a-z0-9_]*$/.test(s.value)) {
      out.push({ name: s.value, file: fm.file, line: lineAt(fm.src, s.start), via: "literal" });
    }
  }
  return out;
}

function emptyRes() { return { names: [], unresolved: [], journey: false, sink: false, forwarder: false, via: [] }; }
function merge(into, r) {
  into.names.push(...r.names);
  into.unresolved.push(...r.unresolved);
  into.journey ||= r.journey;
  into.sink ||= r.sink;
  into.forwarder ||= r.forwarder;
  into.via.push(...r.via);
  return into;
}

// Resolves one argument expression code[a..b] to event names.
function resolveExpr(model, fm, a, b, depth, seen) {
  const res = emptyRes();
  const text = fm.src.slice(a, b).trim();
  const loc = `${fm.file}:${lineAt(fm.src, a)}`;
  if (depth > MAX_DEPTH) { res.unresolved.push(`${loc}: gave up following "${text}" after ${MAX_DEPTH} hops`); return res; }
  const s = fm.byStart.get(a);
  if (s && s.end === b) {
    if (!s.interpolated) { res.names.push({ name: s.value, file: fm.file, line: lineAt(fm.src, a), via: "literal" }); return res; }
    if (basename(fm.file) === LANG[fm.platform].journeyHelper && /\\\(journey\)|\$\{journey\}|\$journey\b/.test(s.raw)) {
      res.journey = true;
      res.via.push("journey rule");
      return res;
    }
    res.unresolved.push(`${loc}: interpolated event name ${s.raw}`);
    return res;
  }
  const path = text.match(/^[A-Za-z_]\w*(?:\s*\.\s*[A-Za-z_]\w*)*$/)?.[0]?.replace(/\s+/g, "");
  if (path) {
    const c = resolveConst(model, fm, a, path);
    if (c) { res.names.push({ name: c.value, file: fm.file, line: lineAt(fm.src, a), via: c.key }); return res; }
    return resolveIdent(model, fm, a, path.split(".")[0], depth, seen);
  }
  // Any other expression (ternary, when, if/else): its constants and literals.
  const found = namesIn(model, fm, a, b);
  if (found.length) { res.names.push(...found); res.via.push("expression"); return res; }
  res.unresolved.push(`${loc}: cannot resolve event expression "${text.replace(/\s+/g, " ").slice(0, 80)}"`);
  return res;
}

function resolveIdent(model, fm, pos, ident, depth, seen) {
  const res = emptyRes();
  const key = `${fm.file}:${pos}:${ident}`;
  if (seen.has(key)) return res;
  seen.add(key);
  const loc = `${fm.file}:${lineAt(fm.src, pos)}`;
  const fn = enclosingFunc(fm, pos);
  const limit = fn ? fn.bodyStart - 1 : -1;

  // Closure parameters, innermost closure first.
  for (const brace of enclosingBraces(fm.code, pos, limit)) {
    const params = closureParams(fm.code, brace, fm.lang);
    const hit = params ? params.indexOf(ident) : (ident === "it" && fm.lang === "kotlin" ? 0 : -1);
    if (hit < 0) continue;
    return resolveClosure(model, fm, brace, hit, depth, seen);
  }

  // Locals declared before `pos` in the enclosing function, nearest first.
  const scopeText = fm.code.slice(limit + 1, pos);
  const binds = [...scopeText.matchAll(new RegExp(`\\b(?:let|var|val)\\s+${ident}\\b[^=\\n]*=(?!=)|\\bfor\\s*\\(?\\s*${ident}\\s+in\\b`, "g"))];
  if (binds.length) {
    const m = binds[binds.length - 1];
    const start = limit + 1 + m.index + m[0].length;
    const end = m[0].startsWith("for") ? fm.code.indexOf("{", start) : statementEnd(fm.code, start);
    return resolveInitializer(model, fm, start, end, depth, seen);
  }

  // Parameters of the enclosing function.
  if (fn) {
    const p = fn.params.find((q) => q.name === ident);
    if (p) {
      if (fn.name === "capture") { res.sink = true; res.via.push(`sink ${fn.name}()`); return res; }
      return resolveCallers(model, fm, fn.name, fn.isPrivate, p, depth, seen, loc);
    }
  }
  res.unresolved.push(`${loc}: "${ident}" is not a literal, event constant, local, or parameter the parser can follow`);
  return res;
}

// A local's initialiser: a bare identifier is followed; otherwise its constants and literals,
// plus those in the body of any app function it calls (one level).
function resolveInitializer(model, fm, a, b, depth, seen) {
  const trimmed = trimSeg(fm.code, a, b);
  const text = fm.src.slice(trimmed.start, trimmed.end);
  if (/^[A-Za-z_]\w*$/.test(text)) return resolveIdent(model, fm, trimmed.start, text, depth + 1, seen);
  const res = emptyRes();
  res.names.push(...namesIn(model, fm, trimmed.start, trimmed.end));
  for (const m of fm.code.slice(trimmed.start, trimmed.end).matchAll(/(?<![\w])(\w+)\s*\(/g)) {
    for (const f of model.funcsByName.get(m[1]) ?? []) {
      if (f.bodyStart >= 0) res.names.push(...namesIn(model, f.fm, f.bodyStart, f.bodyEnd));
    }
  }
  if (res.names.length) { res.via.push("initialiser"); return res; }
  res.unresolved.push(`${fm.file}:${lineAt(fm.src, a)}: cannot resolve initialiser "${text.replace(/\s+/g, " ").slice(0, 80)}"`);
  return res;
}

function resolveClosure(model, fm, brace, paramIndex, depth, seen) {
  const res = emptyRes();
  const before = fm.code.slice(Math.max(0, brace - 300), brace).trimEnd();
  const loc = `${fm.file}:${lineAt(fm.src, brace)}`;
  const each = before.match(/([A-Za-z_]\w*)\s*\??\.\s*forEach$/);
  if (each) return resolveIdent(model, fm, brace - (before.length - before.lastIndexOf(each[1])), each[1], depth + 1, seen);
  const name = before.match(/([A-Za-z_]\w*)\s*(?::[^=\n]*)?=$/)?.[1] ?? before.match(/([A-Za-z_]\w*)$/)?.[1];
  if (!name) { res.unresolved.push(`${loc}: closure parameter forwarded by an unnamed closure`); return res; }
  const sinks = LANG[fm.platform].sinkNames;
  const boundToSink = new RegExp(`\\b(?:${[...sinks].join("|")})\\s*(?::[^=\\n]*)?=\\s*${name}\\b`).test(fm.code);
  if (sinks.has(name) || boundToSink) { res.forwarder = true; res.via.push(`forwarder ${name}`); return res; }
  return resolveCallers(model, fm, name, true, { index: paramIndex, label: "_", name: null }, depth, seen, loc);
}

// Resolves argument `param` at every call of `fnName` (same file only when private).
function resolveCallers(model, fm, fnName, sameFileOnly, param, depth, seen) {
  const res = emptyRes();
  const files = sameFileOnly ? [fm] : model.files;
  let calls = 0;
  for (const cf of files) {
    for (const m of cf.code.matchAll(new RegExp(`(?<![\\w])${fnName}\\s*\\(`, "g"))) {
      if (/\b(func|fun)\s+$/.test(cf.code.slice(Math.max(0, m.index - 12), m.index))) continue;
      const args = splitArgs(cf.code, m.index + m[0].length - 1);
      const arg = pickArg(cf, args, param);
      if (!arg) continue;
      calls++;
      merge(res, resolveExpr(model, cf, arg.start, arg.end, depth + 1, seen));
    }
  }
  res.via.push(`callers of ${fnName}() (${calls})`);
  if (!calls) res.via.push(`${fnName}() is never called`);
  return res;
}

function pickArg(cf, args, param) {
  const labelled = (a) => cf.code.slice(a.start, a.end).match(/^(\w+)\s*(:|=(?!=))/);
  if (param.label && param.label !== "_") {
    const named = args.find((a) => labelled(a)?.[1] === param.label || labelled(a)?.[1] === param.name);
    if (named) return stripLabel(cf, named);
  }
  const a = args[param.index];
  return a ? stripLabel(cf, a) : null;
}

function stripLabel(cf, a) {
  const m = cf.code.slice(a.start, a.end).match(/^\w+\s*(?::(?!:)|=(?!=))\s*/);
  return m && !cf.byStart.get(a.start) ? { start: a.start + m[0].length, end: a.end } : a;
}

// ---------- scanning ----------

export function scanPlatform(model) {
  const cfg = LANG[model.platform];
  const sites = [];
  const unrecognised = [];
  for (const fm of model.files) {
    const hitAt = new Set();
    for (const re of cfg.emitters) {
      for (const m of fm.code.matchAll(re)) {
        const paren = m.index + m[0].length - 1;
        if (hitAt.has(paren)) continue;
        if (/\b(func|fun)\s+$/.test(fm.code.slice(Math.max(0, m.index - 12), m.index))) continue;
        hitAt.add(paren);
        const args = splitArgs(fm.code, paren);
        const named = args.find((a) => /^(type|event)\s*=(?!=)/.test(fm.code.slice(a.start, a.end)));
        const arg = named ? stripLabel(fm, named) : args[0] && stripLabel(fm, args[0]);
        const line = lineAt(fm.src, m.index);
        if (!arg) { sites.push({ file: fm.file, line, arg: "", kind: "unresolved", names: [], unresolved: [`${fm.file}:${line}: capture call with no arguments`], via: [] }); continue; }
        const r = resolveExpr(model, fm, arg.start, arg.end, 0, new Set());
        const kind = r.unresolved.length ? "unresolved" : r.sink ? "sink" : r.forwarder ? "forwarder" : r.journey ? "journey" : fm.byStart.get(arg.start) ? "literal" : "resolved";
        sites.push({ file: fm.file, line, arg: fm.src.slice(arg.start, arg.end).replace(/\s+/g, " "), kind, names: r.names, unresolved: r.unresolved, via: [...new Set(r.via)] });
      }
    }
    // Any other capture call is one the gate does not know how to read: fail, don't skip.
    for (const m of fm.code.matchAll(/\bcapture\s*\(/g)) {
      const paren = m.index + m[0].length - 1;
      if (hitAt.has(paren)) continue;
      if (/\b(func|fun)\s+$/.test(fm.code.slice(Math.max(0, m.index - 12), m.index))) continue;
      unrecognised.push({ file: fm.file, line: lineAt(fm.src, m.index), text: fm.src.slice(m.index - 40 > 0 ? fm.src.lastIndexOf("\n", m.index) + 1 : 0, fm.src.indexOf("\n", m.index)).trim() });
    }
  }
  return { sites, unrecognised, journeys: scanJourneys(model) };
}

// JourneyAttempt.start(J): J_started, plus each outcome called on the bound variable.
function scanJourneys(model) {
  const out = [];
  for (const fm of model.files) {
    if (basename(fm.file) === LANG[model.platform].journeyHelper) continue;
    for (const m of fm.code.matchAll(/\bJourneyAttempt\s*\.\s*start\s*\(/g)) {
      const paren = m.index + m[0].length - 1;
      const line = lineAt(fm.src, m.index);
      const arg = splitArgs(fm.code, paren)[0];
      const r = arg ? resolveExpr(model, fm, arg.start, arg.end, 0, new Set()) : { names: [], unresolved: [`${fm.file}:${line}: JourneyAttempt.start() with no journey`] };
      const lineStart = fm.code.lastIndexOf("\n", m.index) + 1;
      const prefix = fm.code.slice(lineStart, m.index);
      const local = prefix.match(/\b(?:let|var|val)\s+(\w+)/)?.[1] ?? null;
      const bound = local ?? prefix.match(/^\s*(\w+)\s*=/)?.[1] ?? null;
      // A local binding only lives in its function, so only that body can settle it;
      // searching the whole file let a same-named variable elsewhere credit the outcome.
      // A property assignment (x = JourneyAttempt.start) may settle in another method.
      const fn = local ? enclosingFunc(fm, m.index) : null;
      const scope = fn && fn.bodyStart >= 0 ? fm.code.slice(fn.bodyStart, fn.bodyEnd) : fm.code;
      const outcomes = bound ? OUTCOMES.filter((o) => new RegExp(`\\b${bound}\\s*\\??\\s*\\.\\s*${o}\\s*\\(`).test(scope)) : [];
      out.push({ file: fm.file, line, journeys: r.names.map((n) => n.name), bound, outcomes, unresolved: r.unresolved });
    }
  }
  return out;
}

// ---------- contract and evaluation ----------

export function readContracts(iosPath, androidPath) {
  const ios = readFileSync(iosPath);
  const android = readFileSync(androidPath);
  const parse = (buf, p) => {
    try { return JSON.parse(buf.toString("utf8")); } catch (e) { throw new Error(`cannot parse contract ${p}: ${e.message}`); }
  };
  const contract = parse(ios, iosPath);
  const androidContract = parse(android, androidPath);
  if (!contract.events || typeof contract.events !== "object") throw new Error(`contract ${iosPath} has no "events" object`);
  for (const [name, e] of Object.entries(contract.events)) {
    if (!Array.isArray(e.platforms) || !e.platforms.every((p) => PLATFORMS.includes(p))) {
      throw new Error(`contract event "${name}" has platforms ${JSON.stringify(e.platforms)}; expected a list of "ios"/"android"`);
    }
  }
  return { contract, identical: ios.equals(android), drift: ios.equals(android) ? null : driftSummary(ios, android, contract, androidContract) };
}

function driftSummary(a, b, ca, cb) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const line = a.subarray(0, i).toString("utf8").split("\n").length;
  const out = [`first difference at byte ${i} (line ${line}); sizes ${a.length} vs ${b.length} bytes`];
  const ea = ca.events ?? {};
  const eb = cb.events ?? {};
  const onlyIos = Object.keys(ea).filter((k) => !(k in eb));
  const onlyAndroid = Object.keys(eb).filter((k) => !(k in ea));
  const changed = Object.keys(ea).filter((k) => k in eb && JSON.stringify(ea[k]) !== JSON.stringify(eb[k]));
  if (onlyIos.length) out.push(`events only in the iOS copy: ${onlyIos.join(", ")}`);
  if (onlyAndroid.length) out.push(`events only in the Android copy: ${onlyAndroid.join(", ")}`);
  if (changed.length) out.push(`events that differ: ${changed.join(", ")}`);
  const keys = new Set([...Object.keys(ca), ...Object.keys(cb)]);
  const topChanged = [...keys].filter((k) => k !== "events" && JSON.stringify(ca[k]) !== JSON.stringify(cb[k]));
  if (topChanged.length) out.push(`top-level keys that differ: ${topChanged.join(", ")}`);
  if (!onlyIos.length && !onlyAndroid.length && !changed.length && !topChanged.length) out.push("parsed content is equal: whitespace, key order or encoding differs");
  return out;
}

const platKey = (ps) => [...new Set(ps)].sort().join("+");

export function evaluate({ contract, identical, drift }, scans, allowlist) {
  const failures = [];
  const stale = [];
  const events = contract.events;
  if (!identical) {
    failures.push({ check: 1, subject: "analytics-events.json", fix: `the iOS and Android copies differ (${drift.join("; ")}). Make them byte-identical: copy the agreed version over the other, e.g. cp roammate-app-ios/analytics-events.json roammate-app-android/analytics-events.json` });
  }

  // Check 2: single-platform events.
  const single = indexAllowlist(allowlist.events ?? [], (a) => a.event, failures, "events");
  for (const [name, e] of Object.entries(events)) {
    const want = platKey(e.platforms);
    const a = single.get(name);
    if (want === "android+ios") {
      if (a) stale.push({ section: "events", event: name, why: "declared for both platforms now; remove the entry" });
      continue;
    }
    if (!a) {
      failures.push({ check: 2, subject: name, fix: `declared for ${want || "no platform"} only. Add it to the other platform in both contract copies, or add to event-allowlist.json "events": ${JSON.stringify({ event: name, platforms: e.platforms, reason: "<why>", bead: "<bead-id>" })}` });
    } else if (platKey(a.platforms ?? []) !== want) {
      failures.push({ check: 2, subject: name, fix: `allowlist says ${JSON.stringify(a.platforms)} but the contract declares ${JSON.stringify(e.platforms)}: update the entry's platforms (and reason)` });
    }
  }
  for (const a of allowlist.events ?? []) if (!(a.event in events)) stale.push({ section: "events", event: a.event, why: "no longer in the contract; remove the entry" });

  // Emission per platform.
  const emitted = {};
  for (const p of PLATFORMS) {
    emitted[p] = new Map();
    const add = (name, at) => {
      if (name.startsWith("$")) return;
      if (!emitted[p].has(name)) emitted[p].set(name, []);
      emitted[p].get(name).push(at);
    };
    for (const s of scans[p].sites) for (const n of s.names) add(n.name, { file: n.file, line: n.line, site: `${s.file}:${s.line}`, via: n.via });
    for (const j of scans[p].journeys) for (const J of j.journeys) {
      add(`${J}_started`, { file: j.file, line: j.line, via: "JourneyAttempt.start" });
      for (const o of j.outcomes) add(`${J}_${o}`, { file: j.file, line: j.line, via: `${j.bound}.${o}()` });
    }
  }

  // Check 3: declared but not emitted.
  const nyi = indexAllowlist(allowlist.not_yet_instrumented ?? [], (a) => `${a.event}|${a.platform}`, failures, "not_yet_instrumented");
  const declaredNotEmitted = { ios: [], android: [] };
  for (const [name, e] of Object.entries(events)) {
    for (const p of e.platforms) {
      if (emitted[p].has(name)) {
        if (nyi.has(`${name}|${p}`)) stale.push({ section: "not_yet_instrumented", event: name, platform: p, why: `now emitted on ${p}; remove the entry` });
        continue;
      }
      declaredNotEmitted[p].push(name);
      if (!nyi.has(`${name}|${p}`)) {
        failures.push({ check: 3, subject: `${name} (${p})`, fix: `declared for ${p} but no ${p} call site emits it. Instrument it, drop ${p} from its platforms in both contract copies, or add to event-allowlist.json "not_yet_instrumented": ${JSON.stringify({ event: name, platform: p, reason: "<why>", bead: "<bead-id>" })}` });
      }
    }
  }
  for (const a of allowlist.not_yet_instrumented ?? []) {
    if (!events[a.event]?.platforms.includes(a.platform)) stale.push({ section: "not_yet_instrumented", event: a.event, platform: a.platform, why: `not declared for ${a.platform}; remove the entry` });
  }

  // Check 4: emitted but not declared (for that platform).
  const und = indexAllowlist(allowlist.undeclared ?? [], (a) => `${a.event}|${a.platform}`, failures, "undeclared");
  const emittedNotDeclared = { ios: [], android: [] };
  const emittedDeclared = { ios: 0, android: 0 };
  for (const p of PLATFORMS) {
    for (const [name, locs] of emitted[p]) {
      const declared = events[name]?.platforms.includes(p);
      if (declared) {
        emittedDeclared[p]++;
        if (und.has(`${name}|${p}`)) stale.push({ section: "undeclared", event: name, platform: p, why: `now declared for ${p}; remove the entry` });
        continue;
      }
      emittedNotDeclared[p].push({ name, locs, inContract: name in events });
      if (!und.has(`${name}|${p}`)) {
        const where = locs.map((l) => rel(l)).join(", ");
        const what = name in events ? `in the contract but not for ${p} (declared ${JSON.stringify(events[name].platforms)})` : "not in the contract";
        failures.push({ check: 4, subject: `${name} (${p})`, fix: `emitted at ${where} but ${what}. Declare it for ${p} in both contract copies, rename it to the contract's name, or add to event-allowlist.json "undeclared": ${JSON.stringify({ event: name, platform: p, reason: "<why>", bead: "<bead-id>" })}` });
      }
    }
  }
  for (const a of allowlist.undeclared ?? []) {
    if (!emitted[a.platform]?.has(a.event)) stale.push({ section: "undeclared", event: a.event, platform: a.platform, why: `no longer emitted on ${a.platform}; remove the entry` });
  }

  // Structure the parser could not follow: always a failure, never allowlistable.
  for (const p of PLATFORMS) {
    for (const s of scans[p].sites) for (const u of s.unresolved) {
      failures.push({ check: "parse", subject: `${p} call site`, fix: `${relStr(u)}: use an AnalyticsEvents constant or literal at the call site, or teach event-coverage.mjs this shape` });
    }
    for (const j of scans[p].journeys) for (const u of j.unresolved) {
      failures.push({ check: "parse", subject: `${p} journey`, fix: `${relStr(u)}: pass a journey constant to JourneyAttempt.start` });
    }
    for (const u of scans[p].unrecognised) {
      failures.push({ check: "parse", subject: `${p} capture call`, fix: `${rel(u)} "${u.text}" is a capture() call the gate does not recognise as an emitter: add its receiver to LANG.${p}.emitters, or rename it if it is not analytics` });
    }
  }
  return { failures, stale, emitted, declaredNotEmitted, emittedNotDeclared, emittedDeclared };
}

function indexAllowlist(list, keyOf, failures, section) {
  const m = new Map();
  for (const a of list) {
    const k = keyOf(a);
    if (m.has(k)) failures.push({ check: "allowlist", subject: k, fix: `event-allowlist.json "${section}" lists ${k} twice; keep one` });
    else m.set(k, a);
  }
  return m;
}

// ---------- output ----------

let ROOTS = [];
function rel(loc) {
  const root = ROOTS.find((r) => loc.file.startsWith(r + "/"));
  return `${root ? join(basename(root), relative(root, loc.file)) : loc.file}:${loc.line}`;
}
function relStr(s) {
  const m = s.match(/^(\/[^:]+):(\d+)(.*)$/s);
  return m ? rel({ file: m[1], line: m[2] }) + m[3] : s;
}

function summary(result) {
  const { contract, evaluation, scans } = result;
  const bySet = {};
  for (const e of Object.values(contract.events)) bySet[platKey(e.platforms)] = (bySet[platKey(e.platforms)] ?? 0) + 1;
  const kinds = (p) => {
    const k = {};
    for (const s of scans[p].sites) k[s.kind] = (k[s.kind] ?? 0) + 1;
    return k;
  };
  return {
    contractEvents: Object.keys(contract.events).length,
    byPlatformSet: bySet,
    copiesIdentical: result.contracts.identical,
    perPlatform: Object.fromEntries(PLATFORMS.map((p) => [p, {
      callSites: scans[p].sites.length,
      siteKinds: kinds(p),
      journeyStarts: scans[p].journeys.length,
      emittedNames: evaluation.emitted[p].size,
      emittedAndDeclared: evaluation.emittedDeclared[p],
      declaredNotEmitted: evaluation.declaredNotEmitted[p].length,
      emittedNotDeclared: evaluation.emittedNotDeclared[p].length,
      unresolvedSites: scans[p].sites.filter((s) => s.kind === "unresolved").length + scans[p].unrecognised.length,
    }])),
  };
}

function markdown(result) {
  const { evaluation, scans } = result;
  const s = summary(result);
  const L = [];
  L.push("# Analytics event coverage (iOS vs Android)", "");
  L.push(`Contract copies byte-identical: ${s.copiesIdentical ? "yes" : "NO"}. Contract events: ${s.contractEvents}.`, "");
  L.push("|Declared platforms|Events|", "|-|-|");
  for (const [k, v] of Object.entries(s.byPlatformSet).sort()) L.push(`|${k}|${v}|`);
  L.push("");
  L.push("|Platform|Call sites|Journey starts|Emitted names|Emitted and declared|Declared not emitted|Emitted not declared|Unresolved|", "|-|-|-|-|-|-|-|-|");
  for (const p of PLATFORMS) {
    const x = s.perPlatform[p];
    L.push(`|${p}|${x.callSites}|${x.journeyStarts}|${x.emittedNames}|${x.emittedAndDeclared}|${x.declaredNotEmitted}|${x.emittedNotDeclared}|${x.unresolvedSites}|`);
  }
  L.push("");
  const nyi = new Set((result.allowlist.not_yet_instrumented ?? []).map((a) => `${a.event}|${a.platform}`));
  const und = new Set((result.allowlist.undeclared ?? []).map((a) => `${a.event}|${a.platform}`));
  for (const p of PLATFORMS) {
    const list = evaluation.declaredNotEmitted[p];
    L.push(`## Declared for ${p}, not emitted (${list.length})`, "");
    if (!list.length) L.push("None.");
    else L.push("|Event|Allowlisted|", "|-|-|", ...list.map((n) => `|${n}|${nyi.has(`${n}|${p}`) ? "yes" : "NO"}|`));
    L.push("");
  }
  for (const p of PLATFORMS) {
    const list = evaluation.emittedNotDeclared[p];
    L.push(`## Emitted on ${p}, not declared for ${p} (${list.length})`, "");
    if (!list.length) L.push("None.");
    else {
      L.push("|Event|In contract|Emitted at|Allowlisted|", "|-|-|-|-|");
      for (const e of list) L.push(`|${e.name}|${e.inContract ? "other platform" : "no"}|${rel(e.locs[0])}${e.locs.length > 1 ? ` (+${e.locs.length - 1})` : ""}|${und.has(`${e.name}|${p}`) ? "yes" : "NO"}|`);
    }
    L.push("");
  }
  L.push("## Dynamic call sites", "");
  L.push("Resolved by following parameters, locals, closures or the journey rule (see the header of event-coverage.mjs).", "");
  L.push("|Platform|Site|Argument|Kind|Resolved to|", "|-|-|-|-|-|");
  for (const p of PLATFORMS) {
    // Direct literals and constants carry no `via`; everything else was followed.
    for (const site of scans[p].sites.filter((x) => x.via.length || x.kind === "unresolved")) {
      const names = [...new Set(site.names.map((n) => n.name))];
      const to = site.kind === "unresolved" ? "UNRESOLVED" : names.length ? names.join(", ") : site.via.join("; ");
      L.push(`|${p}|${rel(site)}|\`${site.arg.slice(0, 60).replaceAll("|", "\\|")}\`|${site.kind}|${to}|`);
    }
  }
  L.push("");
  L.push("## Journey starts", "");
  L.push("|Platform|Site|Journey|Outcomes on bound variable|", "|-|-|-|-|");
  for (const p of PLATFORMS) for (const j of scans[p].journeys) L.push(`|${p}|${rel(j)}|${j.journeys.join(",") || "UNRESOLVED"}|${j.outcomes.join(",") || "none"}${j.bound ? ` (${j.bound})` : " (unbound)"}|`);
  L.push("");
  if (evaluation.stale.length) {
    L.push(`## Stale allowlist entries (${evaluation.stale.length}, not failing)`, "");
    for (const x of evaluation.stale) L.push(`- ${x.section}: ${x.event}${x.platform ? ` (${x.platform})` : ""}: ${x.why}`);
    L.push("");
  }
  L.push(evaluation.failures.length
    ? `## FAIL: ${evaluation.failures.length} item(s) need action`
    : "## PASS: copies identical, every gap allowlisted, every call site resolved", "");
  for (const f of evaluation.failures) L.push(`- [check ${f.check}] ${f.subject}: ${f.fix}`);
  return L.join("\n");
}

function toJson(result) {
  const { evaluation, scans } = result;
  const site = (x) => ({ at: rel(x), arg: x.arg, kind: x.kind, names: [...new Set(x.names.map((n) => n.name))], via: x.via, unresolved: x.unresolved.map(relStr) });
  return {
    summary: summary(result),
    declaredNotEmitted: evaluation.declaredNotEmitted,
    emittedNotDeclared: Object.fromEntries(PLATFORMS.map((p) => [p, evaluation.emittedNotDeclared[p].map((e) => ({ event: e.name, inContract: e.inContract, at: e.locs.map(rel) }))])),
    emitted: Object.fromEntries(PLATFORMS.map((p) => [p, Object.fromEntries([...evaluation.emitted[p]].map(([k, v]) => [k, v.map(rel)]))])),
    sites: Object.fromEntries(PLATFORMS.map((p) => [p, scans[p].sites.map(site)])),
    journeys: Object.fromEntries(PLATFORMS.map((p) => [p, scans[p].journeys.map((j) => ({ at: rel(j), journeys: j.journeys, bound: j.bound, outcomes: j.outcomes }))])),
    unrecognised: Object.fromEntries(PLATFORMS.map((p) => [p, scans[p].unrecognised.map((u) => ({ at: rel(u), text: u.text }))])),
    stale: evaluation.stale,
    failures: evaluation.failures,
    ok: evaluation.failures.length === 0,
  };
}

// ---------- main ----------

export function run(opts) {
  ROOTS = [opts.ios, opts.android].map((p) => resolve(p));
  const contracts = readContracts(opts.iosContract, opts.androidContract);
  const scans = {};
  for (const p of PLATFORMS) scans[p] = scanPlatform(loadPlatform(resolve(opts[p]), p));
  let allowlist = opts.allowlistData;
  if (!allowlist) {
    try { allowlist = JSON.parse(readFileSync(opts.allowlist, "utf8")); } catch (e) { throw new Error(`cannot read allowlist ${opts.allowlist}: ${e.message}`); }
  }
  const evaluation = evaluate(contracts, scans, allowlist);
  return { contracts, contract: contracts.contract, scans, allowlist, evaluation };
}

export { markdown, toJson };

const FLAGS = { "--ios-contract": "iosContract", "--android-contract": "androidContract", "--ios": "ios", "--android": "android", "--allowlist": "allowlist" };

function parseArgs(argv) {
  const opts = { ...DEFAULTS, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (FLAGS[a] && argv[i + 1]) opts[FLAGS[a]] = argv[++i];
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
    console.error(`event-coverage: ${err.message}`);
    process.exitCode = 2;
  }
}
