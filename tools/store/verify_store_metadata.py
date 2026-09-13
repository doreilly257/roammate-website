#!/usr/bin/env python3
"""Fail the build if store metadata makes a claim whose gate is still closed.

This is the piece fastlane has no concept of. deliver and supply will happily upload
copy describing a feature that is switched off in production — which is exactly what
happened: the App Store advertised an AI Concierge whose endpoint 404s for every
caller, in twelve languages, and nothing anywhere objected.

Rules live in claims.json next to this file. Each names what has to become true before
the claim is allowed, so shipping a feature is what retires a rule.

WHAT A CLEAN RUN DOES NOT MEAN
------------------------------
A PASS means no listed claim matched a known-false pattern. It does NOT mean the
listings are honest. Three classes are invisible to this tool by construction:

  1. A MISSING QUALIFIER. The Arabic Play listing said "identity verification" as a flat
     safety bullet where the English said "an OPTIONAL identity-verification badge".
     Same feature, stronger promise, no pattern can find an absent word. That fault was
     found by a human comparing locales.
  2. A CLAIM NOBODY HAS THOUGHT TO GATE. Every rule here exists because someone found
     the problem first. The tool encodes what we already know is false; it does not
     discover new falsehood.
  3. A CLAIM THAT BECOMES FALSE LATER. no-paywall-forward-risk is the example — true
     today, false the moment monetisation ships, and nothing will notice on its own.

So this is a regression guard, not an audit. It stops a known-false claim coming back.
Finding an unknown one still needs somebody reading the copy against the code.

Usage:
    python3 verify_store_metadata.py fastlane/metadata
    python3 verify_store_metadata.py fastlane/metadata fastlane/metadata/android
    python3 verify_store_metadata.py --warn-only fastlane/metadata

The rule narratives describe historical audit evidence, not current release state.
Exit codes: 0 clean/warnings, 1 error-severity violation, 2 invalid input.
"""
import argparse, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))

# Only lint files users actually read. Skips urls, ids, and anything non-prose.
PROSE = {
    "description.txt", "release_notes.txt", "promotional_text.txt",
    "subtitle.txt", "name.txt", "keywords.txt",
    "full_description.txt", "short_description.txt", "title.txt",
}
DRAFT = re.compile(r"[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|[0-9]{3}))?\.description\.txt\Z")


class InputError(ValueError):
    """Invalid or incomplete lint input; never demoted by --warn-only."""


def load_rules(path):
    with open(path, encoding="utf-8") as f:
        document = json.load(f)
    if not isinstance(document, dict) or not isinstance(document.get('rules'), list) or not document['rules']:
        raise InputError('rules must be a nonempty array in a JSON object')
    seen = set()
    for rule in document['rules']:
        if not isinstance(rule, dict):
            raise InputError('each rule must be an object')
        for field in ('id', 'why', 'allowed_when', 'owner'):
            if not isinstance(rule.get(field), str) or not rule[field].strip():
                raise InputError(f'rule {field} must be a nonempty string')
        if rule['id'] in seen:
            raise InputError(f'duplicate rule id: {rule["id"]}')
        seen.add(rule['id'])
        if rule.get('severity') not in ('error', 'warn'):
            raise InputError(f'invalid severity: {rule["id"]}')
        patterns = rule.get('patterns')
        if not isinstance(patterns, list) or not patterns:
            raise InputError(f'patterns must be a nonempty array: {rule["id"]}')
        for pattern in patterns:
            if not isinstance(pattern, str) or not pattern:
                raise InputError(f'pattern must be a nonempty string: {rule["id"]}')
            try:
                re.compile(pattern, re.I | re.M)
            except (re.error, OverflowError, RecursionError) as error:
                raise InputError(f'invalid pattern in rule {rule["id"]}: {error}') from error
    return document['rules']


def scan(roots, rules, warn_only):
    compiled = [(r, [re.compile(p, re.I | re.M) for p in r["patterns"]]) for r in rules]
    errors, warnings, files = [], [], 0
    seen = set()

    def walk_error(error):
        raise error

    for root in roots:
        if not os.path.isdir(root):
            raise InputError(f'not a directory: {root}')
        supported = 0
        for dirpath, dirnames, filenames in os.walk(root, onerror=walk_error, followlinks=False):
            dirnames.sort()
            for fn in sorted(filenames):
                if fn not in PROSE and not DRAFT.fullmatch(fn):
                    continue
                p = os.path.join(dirpath, fn)
                supported += 1
                resolved = os.path.realpath(p)
                if resolved in seen:
                    continue
                if not os.path.isfile(p):
                    raise InputError(f'not a regular prose file: {p}')
                with open(p, encoding="utf-8") as f:
                    text = f.read()
                seen.add(resolved)
                files += 1
                for rule, pats in compiled:
                    for pat in pats:
                        m = pat.search(text)
                        if not m:
                            continue
                        line = text[:m.start()].count("\n") + 1
                        hit = {
                            "file": os.path.relpath(p),
                            "line": line,
                            "rule": rule["id"],
                            "match": m.group(0)[:70],
                            "why": rule["why"],
                            "allowed_when": rule["allowed_when"],
                            "owner": rule["owner"],
                        }
                        (warnings if (rule["severity"] == "warn" or warn_only) else errors).append(hit)
                        break
        if not supported:
            raise InputError(f'no supported prose files in root: {root}')
    return errors, warnings, files


def report(title, hits):
    if not hits:
        return
    print(f"\n{title} ({len(hits)})")
    by_rule = {}
    for h in hits:
        by_rule.setdefault(h["rule"], []).append(h)
    for rule_id, group in by_rule.items():
        g = group[0]
        print(f"\n  [{rule_id}]  owner: {g['owner']}")
        print(f"  why          {g['why']}")
        print(f"  allowed when {g['allowed_when']}")
        for h in group:
            print(f"    {h['file']}:{h['line']}  →  {h['match']!r}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("roots", nargs="+")
    ap.add_argument("--rules", default=os.path.join(HERE, "claims.json"))
    ap.add_argument("--warn-only", action="store_true",
                    help="demote claim violations only; invalid input still exits 2")
    a = ap.parse_args()

    try:
        rules = load_rules(a.rules)
        errors, warnings, files = scan(a.roots, rules, a.warn_only)
    except (OSError, UnicodeError, ValueError, re.error) as error:
        print(f'INPUT ERROR: {error}', file=sys.stderr)
        return 2

    print(f"store metadata lint: {files} prose files, {len(rules)} rules")
    report("WARNINGS", warnings)
    report("ERRORS", errors)

    if errors:
        print(f"\nFAIL — {len(errors)} claim(s) whose gate is still closed. "
              f"Fix the copy, or ship the feature and retire the rule in claims.json.")
        return 1
    print("\nPASS — no closed-gate claims found." if not warnings else
          "\nPASS with warnings.")
    print("  NOTE: a pass means no LISTED claim matched a known-false pattern.\n"
          "  It does not mean the listings are honest. This tool cannot see a missing\n"
          "  qualifier (an absent \"optional\"), a claim nobody has thought to gate, or\n"
          "  a claim that becomes false later. It is a regression guard, not an audit.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
