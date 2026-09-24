import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { run, clientKey, backendKey, extractStrings } from "./route-coverage.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "route-coverage.mjs");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "route-coverage-"));
  const files = {
    "api/src/index.ts": `
import { Hono } from "hono";
import { userRoutes } from "./routes/users";
import {
  chatRoutes,
  webhookRoutes,
} from "./routes/chat";
import { adminRoutes } from "./routes/admin";
import { shareRoutes } from "./routes/share";
const app = new Hono();
app.get("/health", (c) => c.json({}));
app.route("/", shareRoutes);
const v1 = new Hono();
v1.route("/admin", adminRoutes);
v1.route("/verification/webhook", webhookRoutes);
v1.post("/admin/reindex", (c) => c.json({}));
v1.route("/users", userRoutes);
v1.route("/", chatRoutes);
app.route("/v1", v1);
`,
    "api/src/routes/users.ts": `
export const userRoutes = new Hono();
userRoutes.get("/me", h);
userRoutes.get("/:id", h);
userRoutes.post("/:id/follow", h);
userRoutes
  .get("/:id/stats", h)
  .delete("/:id/stats", h);
userRoutes.get(
  "/lonely",
  h,
);
`,
    "api/src/routes/chat.ts": `
export const chatRoutes = new Hono();
export const webhookRoutes = new Hono();
chatRoutes.put("/conversations/:id/messages/:messageId", h);
chatRoutes.delete("/conversations/:id/messages/:messageId", h);
webhookRoutes.post("/", h);
`,
    "api/src/routes/admin.ts": `export const adminRoutes = new Hono();\nadminRoutes.get("/stats", h);\n`,
    "api/src/routes/share.ts": `export const shareRoutes = new Hono();\nshareRoutes.get("/t/:id", h);\n`,
    "ios/App/UserService.swift": `
let a = Endpoint(path: "/users/me")
let b = Endpoint(
    path: "/users/\\(user.id(for: "x"))/follow",
    method: .post
)
// Endpoint(path: "/users/lonely")  -- a comment, not a call
let ttl = [("/users/lonely", 60)]
await cacheInvalidator("/users/lonely")
if path.hasPrefix("/users/lonely") {}
let edit = Endpoint(path: "/conversations/\\(cid)/messages/\\(mid)", method: .put)
`,
    "ios/AppTests/Fake.swift": `let t = Endpoint(path: "/users/lonely")\n`,
    "android/core/network/src/main/kotlin/UsersApi.kt": `
interface UsersApi {
    @GET("users/{id}")
    suspend fun user(@Path("id") id: String)
    @POST("users/{id}/follow")
    suspend fun follow(@Path("id") id: String)
    @HTTP(method = "DELETE", path = "users/{id}/stats", hasBody = true)
    suspend fun clear(@Path("id") id: String)
    // @GET("users/lonely")
    @DELETE("conversations/{id}/messages/{messageId}")
    suspend fun del(@Path("id") id: String, @Path("messageId") m: String)
}
val ws = "wss://api.roammate.com/v1/users/$userId/stats"
`,
    "android/core/network/src/test/kotlin/FakeApi.kt": `interface F { @GET("users/lonely") fun x() }\n`,
    "android/build/generated/Gen.kt": `interface G { @GET("users/lonely") fun x() }\n`,
  };
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  return {
    root,
    opts: { backend: join(root, "api/src/index.ts"), ios: join(root, "ios"), android: join(root, "android") },
  };
}

const tags = (result) => Object.fromEntries(result.entries.map((e) => [e.route, e.tag]));

test("normalises params from all three sources to the same key", () => {
  assert.equal(backendKey("/v1/users/:id/follow"), "v1/users/:p/follow");
  assert.equal(clientKey("users/{id}/follow"), "v1/users/:p/follow");
  const [s] = extractStrings('x = "/users/\\(u.id)/follow/"', "swift");
  assert.equal(clientKey(s.value), "v1/users/:p/follow");
  const [k] = extractStrings('x = "v1/users/${u.id}/follow?x=1"', "kotlin");
  assert.equal(clientKey(k.value), "v1/users/:p/follow");
  assert.equal(clientKey("https://api.roammate.com/v1/users/me"), "v1/users/me");
  assert.equal(clientKey("https://example.com/v1/users/me"), null);
});

test("parses mounts, chains, multi-line handlers and skips admin/webhook", () => {
  const { root, opts } = fixture();
  try {
    const r = run({ ...opts, allowlistData: [] });
    const paths = new Set(r.backend.routes.map((x) => `${x.method} ${x.path}`));
    for (const p of ["GET /v1/users/me", "GET /v1/users/:id", "POST /v1/users/:id/follow", "GET /v1/users/:id/stats",
      "DELETE /v1/users/:id/stats", "GET /v1/users/lonely", "PUT /v1/conversations/:id/messages/:messageId"]) {
      assert.ok(paths.has(p), `missing ${p}`);
    }
    assert.ok(![...paths].some((p) => p.includes("/admin") || p.includes("webhook")));
    assert.deepEqual(r.backend.skipped.map((s) => [s.prefix, s.count]), [["/v1/admin", 2], ["/v1/verification/webhook", 1]]);
    assert.equal(r.backend.outOfScope, 2); // app.get("/health") + shareRoutes
  } finally { rmSync(root, { recursive: true }); }
});

test("tags routes per platform, ignoring comments, tests, build dirs and cache tables", () => {
  const { root, opts } = fixture();
  try {
    const r = run({ ...opts, allowlistData: [] });
    assert.deepEqual(tags(r), {
      "/v1/conversations/:id/messages/:messageId": "both",
      "/v1/users/:id": "android-only",
      "/v1/users/:id/follow": "both",
      "/v1/users/:id/stats": "android-only",
      "/v1/users/lonely": "none",
      "/v1/users/me": "ios-only",
    });
    const follow = r.entries.find((e) => e.route === "/v1/users/:id/follow");
    assert.match(follow.ios[0].file, /UserService\.swift$/);
    assert.equal(follow.ios[0].line, 4);
    assert.equal(follow.ios[0].method, "POST");
    // "me" is literal, so the ios call must not also count for /users/:id.
    assert.equal(r.entries.find((e) => e.route === "/v1/users/:id").ios.length, 0);
    const msgs = r.entries.find((e) => e.route === "/v1/conversations/:id/messages/:messageId");
    assert.ok(msgs.methodWarnings.some((w) => /PUT .*only ios/.test(w)));
    assert.ok(msgs.methodWarnings.some((w) => /DELETE .*only android/.test(w)));
  } finally { rmSync(root, { recursive: true }); }
});

test("gate: fails on unlisted or mismatched routes, passes when all are listed", () => {
  const { root, opts } = fixture();
  try {
    const listed = [
      { route: "/v1/users/:id", status: "android-only" },
      { route: "/v1/users/:userId/stats", status: "android-only" }, // param names don't matter
      { route: "/v1/users/lonely", status: "none" },
      { route: "/v1/users/me", status: "ios-only" },
    ];
    assert.equal(run({ ...opts, allowlistData: listed }).evaluation.failures.length, 0);

    const missing = run({ ...opts, allowlistData: listed.slice(1) }).evaluation.failures;
    assert.equal(missing.length, 1);
    assert.match(missing[0].fix, /add to route-allowlist\.json: .*"route":"\/v1\/users\/:id","status":"android-only"/);

    const wrong = run({ ...opts, allowlistData: [...listed.slice(0, 3), { route: "/v1/users/me", status: "none" }] }).evaluation;
    assert.equal(wrong.failures.length, 1);
    assert.match(wrong.failures[0].fix, /allowlist says "none" but the route is now "ios-only"/);

    const stale = run({ ...opts, allowlistData: [...listed, { route: "/v1/users/:id/follow", status: "ios-only" }, { route: "/v1/gone", status: "none" }] }).evaluation;
    assert.equal(stale.failures.length, 0, "stale entries warn, they do not fail");
    assert.equal(stale.stale.length, 2);
  } finally { rmSync(root, { recursive: true }); }
});

test("CLI exit codes: 1 on a gap, 0 when allowlisted, --json is parseable", () => {
  const { root, opts } = fixture();
  try {
    const allow = join(root, "allow.json");
    const args = ["--backend", opts.backend, "--ios", opts.ios, "--android", opts.android, "--allowlist", allow];
    writeFileSync(allow, JSON.stringify([{ route: "/v1/users/me", status: "ios-only" }]));
    const bad = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /FAIL: 3 route\(s\) need action/);

    writeFileSync(allow, JSON.stringify([
      { route: "/v1/users/me", status: "ios-only" }, { route: "/v1/users/:id", status: "android-only" },
      { route: "/v1/users/:id/stats", status: "android-only" }, { route: "/v1/users/lonely", status: "none" },
    ]));
    const good = spawnSync(process.execPath, [SCRIPT, ...args, "--json"], { encoding: "utf8" });
    assert.equal(good.status, 0, good.stderr);
    const j = JSON.parse(good.stdout);
    assert.deepEqual(j.summary, { both: 2, "ios-only": 1, "android-only": 2, none: 1 });
    assert.equal(j.ok, true);
  } finally { rmSync(root, { recursive: true }); }
});

// Review fixes, 2026-09-24: each of these was a silent false green.

test("a nested .route() inside a route file fails the gate instead of warning", () => {
  const { root, opts } = fixture();
  try {
    const users = join(root, "api/src/routes/users.ts");
    writeFileSync(users, `export const userRoutes = new Hono();\nuserRoutes.get("/me", h);\nuserRoutes.route("/v2", nestedRoutes);\n`);
    const r = run({ ...opts, allowlistData: [] });
    const f = r.evaluation.failures.find((x) => x.tag === "unparsed");
    assert.ok(f, "nested mount must produce a failure");
    assert.match(f.fix, /nested mount userRoutes\.route\("\/v2"\)/);
  } finally { rmSync(root, { recursive: true }); }
});

test("chained handler after a long handler body is captured (documents behaviour; the 400-char window was never reachable)", () => {
  const { root, opts } = fixture();
  try {
    const users = join(root, "api/src/routes/users.ts");
    const pad = "  // " + "x".repeat(600) + "\n";
    writeFileSync(users, `export const userRoutes = new Hono();\nuserRoutes\n  .get("/me", auth, rateLimit, async (c) => {\n${pad}    return c.json({});\n  })\n  .post("/far-chained", h);\n`);
    const r = run({ ...opts, allowlistData: [] });
    assert.ok(r.backend.routes.some((x) => x.path === "/v1/users/far-chained"), "chained route after a long handler body was dropped");
  } finally { rmSync(root, { recursive: true }); }
});

test("an escaped quote inside a string does not derail balanced-paren skipping", () => {
  const { root, opts } = fixture();
  try {
    const users = join(root, "api/src/routes/users.ts");
    writeFileSync(users, `export const userRoutes = new Hono();\nuserRoutes\n  .get("/me", (c) => c.text("a \\" ) b"))\n  .post("/after-escape", h);\n`);
    const r = run({ ...opts, allowlistData: [] });
    assert.ok(r.backend.routes.some((x) => x.path === "/v1/users/after-escape"), "route after an escaped quote was dropped");
  } finally { rmSync(root, { recursive: true }); }
});

test("two allowlist entries naming the same route fail instead of the last silently winning", () => {
  const { root, opts } = fixture();
  try {
    const r = run({ ...opts, allowlistData: [
      { route: "/v1/users/:id", status: "android-only" },
      { route: "/v1/users/:userId", status: "ios-only" },
    ] });
    assert.ok(r.evaluation.failures.some((x) => x.tag === "duplicate"), "duplicate allowlist key must fail");
  } finally { rmSync(root, { recursive: true }); }
});
