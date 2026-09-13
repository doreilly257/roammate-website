# contactus Worker recovery

Recovered from the existing Cloudflare `contactus` Worker on 2026-09-13 using
the read-only `GET /accounts/{account_id}/workers/scripts/contactus` endpoint.
The recovered script serves several sites; it is not a roammate-only handler.
The user approved this source home for bead `roammate-app-ios-22q8`.

**Local fix only: nothing in this directory has been deployed.** No deployment
configuration or automatic integration into the website deployment is added.
Bindings, routes, compatibility settings, and other deployment metadata have not
been reconstructed; this directory is not a complete production deployment bundle.

## Scoped changes

- Read the request body once, decoding identity or gzip before parsing JSON.
- Limit the decoded body to 64 KiB, including decompressed gzip data.
- Reject malformed JSON/gzip and non-object JSON with 400, oversize bodies with
  413, and unsupported content encodings with 415 before storage.
- Remove the redundant body clone/read from CORS handling. The `website` field
  selects a storage namespace; it is not a honeypot in the recovered source.
- Permit `Content-Encoding` in preflight headers for compressed form requests.

The original multi-site Origin policy, submission metadata, KV routing, and
storage-failure behavior are otherwise preserved. In particular, permissive
wildcard CORS, detailed submission logging, and success responses in some
missing/failed-storage cases remain inherited behavior, not security guarantees.
Any change to those behaviors needs a separately reviewed scope.

## Local verification

```sh
node --check infra/contactus/worker.mjs
node --test infra/contactus/worker.test.mjs
```

Tests use Node built-ins, synthetic form data, and an in-memory KV double. They
make no network requests or real submissions. They cover plain/gzip success,
parse failures, decoded-size limits, unsupported encoding, JSON shape, CORS,
and bodyless OPTIONS/GET. The original source failed 8 of the initial 10 cases;
the fixed source passes all 10. Node verification is not deployed Workers
runtime verification. A separately authorized rollout must verify bindings and
the production request path before claiming the live incident resolved.
