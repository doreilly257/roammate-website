#!/usr/bin/env python3
"""Export live App Store Connect metadata into a fastlane deliver tree.

Historical motivation (2026-08-31): the store copy lived ONLY in App Store Connect. It was not
version controlled, not reviewable in a diff, and not deployable from CI. Everything
found wrong on 2026-08-31 — the mandatory-verification claim, the AI Concierge that
404s, read receipts with no UI — was invisible because nobody could read the metadata
next to the code.

Once the tree exists, `fastlane deliver` both uploads it and downloads it, so this
script is only needed for the first export and for verifying drift afterwards.

Usage:
    python3 export_metadata.py --out fastlane/metadata          # write the tree
    python3 export_metadata.py --out fastlane/metadata --diff   # report drift only

Requires ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH in the environment, the same
credentials fastlane uses.
"""
import argparse, json, os, sys, time, subprocess

APP_ID = "6758834253"

# field -> fastlane deliver filename
VERSION_FIELDS = {
    "description":     "description.txt",
    "keywords":        "keywords.txt",
    "promotionalText": "promotional_text.txt",
    "whatsNew":        "release_notes.txt",
    "marketingUrl":    "marketing_url.txt",
    "supportUrl":      "support_url.txt",
}
INFO_FIELDS = {
    "name":     "name.txt",
    "subtitle": "subtitle.txt",
}


def asc(path, params=None):
    """ASC GET requiring PyJWT and cryptography only for live access.

    Import and mocked offline tests need only the standard library.
    """
    try:
        import jwt  # PyJWT
    except ImportError:
        sys.exit("PyJWT required: pip install pyjwt cryptography")
    import urllib.request, urllib.parse
    key_id, issuer, key_path = (os.environ.get(k) for k in
                                ("ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_KEY_PATH"))
    if not all((key_id, issuer, key_path)):
        sys.exit("set ASC_KEY_ID, ASC_ISSUER_ID and ASC_KEY_PATH")
    token = jwt.encode({"iss": issuer, "exp": int(time.time()) + 900, "aud": "appstoreconnect-v1"},
                       open(key_path).read(), algorithm="ES256", headers={"kid": key_id})
    url = "https://api.appstoreconnect.apple.com" + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def write(path, value, diff_only, drift):
    value = (value or "").rstrip("\n") + "\n"
    if diff_only:
        current = None
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                current = f.read()
        if current != value:
            drift.append(path)
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(value)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--diff", action="store_true", help="report drift, write nothing")
    a = ap.parse_args()
    drift = []

    versions = asc(f"/v1/apps/{APP_ID}/appStoreVersions",
                   {"limit": 1, "fields[appStoreVersions]": "versionString,appStoreState"})
    vid = versions["data"][0]["id"]
    vstr = versions["data"][0]["attributes"]["versionString"]

    locs = asc(f"/v1/appStoreVersions/{vid}/appStoreVersionLocalizations",
               {"limit": 50, "fields[appStoreVersionLocalizations]":
                ",".join(["locale"] + list(VERSION_FIELDS))})
    for d in locs["data"]:
        at = d["attributes"]
        loc = at["locale"]
        for field, fname in VERSION_FIELDS.items():
            write(os.path.join(a.out, loc, fname), at.get(field), a.diff, drift)

    infos = asc(f"/v1/apps/{APP_ID}/appInfos", {"limit": 1})
    iid = infos["data"][0]["id"]
    ilocs = asc(f"/v1/appInfos/{iid}/appInfoLocalizations",
                {"limit": 50, "fields[appInfoLocalizations]": "locale,name,subtitle"})
    for d in ilocs["data"]:
        at = d["attributes"]
        loc = at["locale"]
        for field, fname in INFO_FIELDS.items():
            write(os.path.join(a.out, loc, fname), at.get(field), a.diff, drift)

    if a.diff:
        print(f"drift vs live {vstr}: {len(drift)} file(s)")
        for p in drift:
            print("  ", p)
        sys.exit(1 if drift else 0)
    print(f"exported {vstr}: {len(locs['data'])} locales -> {a.out}")


if __name__ == "__main__":
    main()
