import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { run, tokenize } from "./event-coverage.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "event-coverage.mjs");

const CONTRACT = {
  $comment: "fixture",
  version: 1,
  conventions: { journey_events: "<journey>_started | _completed | _failed | _cancelled" },
  journeys: { chat_send: { platforms: ["ios", "android"] } },
  events: {
    app_opened: { platforms: ["ios", "android"] },
    signup_completed: { platforms: ["ios", "android"] },
    login_completed: { platforms: ["ios", "android"] },
    image_sent: { platforms: ["android"] },
    feed_viewed: { platforms: ["ios"] },
    translation_requested: { platforms: ["ios", "android"] },
    chat_send_started: { platforms: ["ios", "android"], journey: "chat_send" },
    chat_send_completed: { platforms: ["ios", "android"], journey: "chat_send" },
    chat_send_failed: { platforms: ["ios", "android"], journey: "chat_send" },
    chat_send_cancelled: { platforms: ["ios", "android"], journey: "chat_send" },
  },
};

const ALLOWLIST = {
  events: [
    { event: "image_sent", platforms: ["android"], reason: "r", bead: "b" },
    { event: "feed_viewed", platforms: ["ios"], reason: "r", bead: "b" },
  ],
  not_yet_instrumented: [
    { event: "chat_send_cancelled", platform: "ios", not_yet_instrumented: true, reason: "r", bead: "b" },
  ],
  undeclared: [],
};

const FILES = {
  "ios/Services/AnalyticsEvents.swift": `
enum AnalyticsEvents {
    enum App {
        static let opened = "app_opened"
    }
    enum Onboarding {
        static let signupCompleted = "signup_completed"
    }
    enum Journey {
        static let chatSend = "chat_send"
    }
    enum Feed { static let viewed = "feed_viewed" }
}
`,
  "ios/Services/AnalyticsEvents+Onboarding.swift": `
extension AnalyticsEvents.Onboarding {
    static let loginCompleted = "login_completed"
    static func completionEvents(isNew: Bool?) -> [String] {
        switch isNew {
        case true: return [signupCompleted]
        default: return [signupCompleted, loginCompleted]
        }
    }
}
`,
  "ios/Services/AnalyticsService.swift": `
actor AnalyticsService {
    func capture(_ event: String, properties: [String: Any]? = nil) {
        PostHogSDK.shared.capture(event, properties: properties)
    }
    func crash() { PostHogSDK.shared.capture("$exception", properties: [:]) }
}
`,
  "ios/Services/JourneyAttempt.swift": `
struct JourneyAttempt {
    let journey: String
    static func start(_ journey: String) async -> JourneyAttempt {
        await AnalyticsService.shared.capture("\\(journey)_started", properties: [:])
        return JourneyAttempt(journey: journey)
    }
    private mutating func settle(_ outcome: String) async {
        await AnalyticsService.shared.capture("\\(journey)_\\(outcome)", properties: [:])
    }
}
`,
  "ios/App/App.swift": `
func launch() async {
    await AnalyticsService.shared.capture(
        AnalyticsEvents.App.opened,
        properties: ["source": "cold"]
    )
    // await AnalyticsService.shared.capture("commented_out_event")
    let s = "AnalyticsService.shared.capture(\\"in_a_string\\")"
    Task { await AnalyticsService.shared.capture(AnalyticsEvents.Feed.viewed) }
    for event in AnalyticsEvents.Onboarding.completionEvents(isNew: nil) {
        await AnalyticsService.shared.capture(event, properties: [:])
    }
}
func send() async {
    var attempt = await JourneyAttempt.start(AnalyticsEvents.Journey.chatSend)
    await attempt.completed()
    await attempt.failed(stage: "request", reason: "offline")
}
`,
  "ios/Chat/ChatViewModel.swift": `
final class ChatViewModel {
    let analyticsSink: (String, [String: Any]) -> Void
    init(analyticsSink: @escaping (String, [String: Any]) -> Void = { event, props in
        Task { await AnalyticsService.shared.capture(event, properties: props) }
    }) { self.analyticsSink = analyticsSink }
    func translate() { analyticsSink("translation_requested", [:]) }
}
`,
  "ios/AppTests/FakeTests.swift": `func t() async { await AnalyticsService.shared.capture("test_only_event") }\n`,
  "android/core/common/src/main/kotlin/AnalyticsEvents.kt": `
package com.roammate.core.common
object AnalyticsEvents {
    const val APP_OPENED = "app_opened"
    const val SIGNUP_COMPLETED = "signup_completed"
    const val LOGIN_COMPLETED = "login_completed"
    const val IMAGE_SENT = "image_sent"
    const val TRANSLATION_REQUESTED = "translation_requested"
}
`,
  "android/core/common/src/main/kotlin/AnalyticsBridge.kt": `
package com.roammate.core.common
object AnalyticsBridge {
    fun interface CaptureHandler { fun capture(event: String, properties: Map<String, Any>) }
    var captureHandler: CaptureHandler? = null
    fun capture(event: String, properties: Map<String, Any> = emptyMap()) {
        captureHandler?.capture(event, properties)
    }
}
`,
  "android/core/common/src/main/kotlin/JourneyAttempt.kt": `
package com.roammate.core.common
class JourneyAttempt private constructor(val journey: String, private val capture: (String, Map<String, Any>) -> Unit) {
    fun completed() = settle("\${journey}_completed")
    fun failed(stage: String) = settle("\${journey}_failed")
    fun cancelled() = settle("\${journey}_cancelled")
    private fun settle(event: String) {
        capture(event, emptyMap())
    }
    companion object {
        private val defaultCapture: (String, Map<String, Any>) -> Unit =
            { event, props -> AnalyticsBridge.capture(event, props) }
        fun start(journey: String, capture: (String, Map<String, Any>) -> Unit = defaultCapture): JourneyAttempt {
            capture("\${journey}_started", emptyMap())
            return JourneyAttempt(journey, capture)
        }
    }
}
object Journeys {
    const val CHAT_SEND = "chat_send"
}
`,
  "android/app/src/main/java/App.kt": `
package com.roammate.app
fun setup() {
    AnalyticsBridge.captureHandler = AnalyticsBridge.CaptureHandler { event, props ->
        Analytics.capture(event, props)
    }
    com.roammate.core.common.AnalyticsBridge.capture(com.roammate.core.common.AnalyticsEvents.APP_OPENED)
    AnalyticsBridge.capture(AnalyticsEvents.TRANSLATION_REQUESTED)
}
object Analytics {
    fun capture(event: String, properties: Map<String, Any> = emptyMap()) {
        PostHog.capture(event, null, properties, null, null, null)
    }
}
`,
  "android/feature/chat/src/main/kotlin/ChatViewModel.kt": `
class ChatViewModel {
    fun send() {
        val attempt = JourneyAttempt.start(Journeys.CHAT_SEND)
        attempt.completed()
        attempt.failed("request")
        attempt.cancelled()
        sendMedia("c1", AnalyticsEvents.IMAGE_SENT)
    }
    private fun sendMedia(id: String, analyticsEvent: String) {
        AnalyticsBridge.capture(analyticsEvent, mapOf("conversation_id" to id))
    }
    fun completed(isNew: Boolean?) {
        val events = when (isNew) {
            true -> listOf(AnalyticsEvents.SIGNUP_COMPLETED)
            else -> listOf(AnalyticsEvents.SIGNUP_COMPLETED, AnalyticsEvents.LOGIN_COMPLETED)
        }
        events.forEach { event -> AnalyticsBridge.capture(event, emptyMap()) }
        val c = '"'
    }
}
`,
  "android/feature/chat/src/test/kotlin/ChatViewModelTest.kt": `fun t() { AnalyticsBridge.capture("test_only_event") }\n`,
};

function fixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "event-coverage-"));
  const files = { ...FILES, ...overrides };
  for (const [rel, body] of Object.entries(files)) {
    if (body === null) continue;
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  const contractText = JSON.stringify(CONTRACT, null, 2) + "\n";
  writeFileSync(join(root, "ios-contract.json"), contractText);
  writeFileSync(join(root, "android-contract.json"), contractText);
  writeFileSync(join(root, "allow.json"), JSON.stringify(ALLOWLIST));
  const opts = {
    iosContract: join(root, "ios-contract.json"),
    androidContract: join(root, "android-contract.json"),
    ios: join(root, "ios"),
    android: join(root, "android"),
    allowlist: join(root, "allow.json"),
  };
  return { root, opts, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

const failuresOf = (r, check) => r.evaluation.failures.filter((f) => check === undefined || f.check === check);

test("baseline fixture passes and resolves every indirection", () => {
  const { opts, cleanup } = fixture();
  try {
    const r = run(opts);
    assert.deepEqual(r.evaluation.failures, []);
    const ios = r.evaluation.emitted.ios;
    const android = r.evaluation.emitted.android;
    for (const n of ["app_opened", "feed_viewed", "signup_completed", "login_completed", "translation_requested", "chat_send_started", "chat_send_completed", "chat_send_failed"]) {
      assert.ok(ios.has(n), `ios should emit ${n}`);
    }
    assert.ok(!ios.has("chat_send_cancelled"), "no .cancelled( on the iOS attempt");
    assert.ok(!ios.has("commented_out_event") && !ios.has("in_a_string") && !ios.has("test_only_event"));
    assert.ok(!ios.has("$exception"), "PostHog built-ins are ignored");
    for (const n of ["app_opened", "image_sent", "signup_completed", "login_completed", "translation_requested", "chat_send_started", "chat_send_completed", "chat_send_failed", "chat_send_cancelled"]) {
      assert.ok(android.has(n), `android should emit ${n}`);
    }
    assert.ok(!android.has("test_only_event"), "test dirs are skipped");
    const kinds = (p) => r.scans[p].sites.map((s) => s.kind);
    assert.ok(kinds("ios").includes("journey") && kinds("ios").includes("sink") && kinds("ios").includes("forwarder"));
    assert.ok(kinds("android").includes("journey") && kinds("android").includes("forwarder"));
    assert.equal(r.scans.ios.sites.filter((s) => s.kind === "unresolved").length, 0);
  } finally { cleanup(); }
});

test("copy drift of one byte fails check 1 with a diff summary", () => {
  const { opts, cleanup } = fixture();
  try {
    const text = readFileSync(opts.androidContract, "utf8").replace('"feed_viewed"', '"feed_viewes"');
    writeFileSync(opts.androidContract, text);
    const r = run(opts);
    const f = failuresOf(r, 1);
    assert.equal(f.length, 1);
    assert.match(f[0].fix, /only in the iOS copy: feed_viewed/);
    assert.match(f[0].fix, /only in the Android copy: feed_viewes/);
  } finally { cleanup(); }
});

test("whitespace-only drift still fails check 1", () => {
  const { opts, cleanup } = fixture();
  try {
    writeFileSync(opts.androidContract, JSON.stringify(CONTRACT));
    const f = failuresOf(run(opts), 1);
    assert.equal(f.length, 1);
    assert.match(f[0].fix, /whitespace, key order or encoding/);
  } finally { cleanup(); }
});

test("single-platform event missing from the allowlist, or with the wrong platforms, fails check 2", () => {
  const { opts, cleanup } = fixture();
  try {
    const r1 = run({ ...opts, allowlistData: { ...ALLOWLIST, events: ALLOWLIST.events.slice(1) } });
    assert.deepEqual(failuresOf(r1).map((f) => [f.check, f.subject]), [[2, "image_sent"]]);
    const wrong = [{ ...ALLOWLIST.events[0], platforms: ["ios"] }, ALLOWLIST.events[1]];
    const r2 = run({ ...opts, allowlistData: { ...ALLOWLIST, events: wrong } });
    assert.match(failuresOf(r2, 2)[0].fix, /allowlist says \["ios"\] but the contract declares \["android"\]/);
  } finally { cleanup(); }
});

test("declared but not emitted fails check 3 unless not_yet_instrumented", () => {
  const { opts, cleanup } = fixture();
  try {
    const r = run({ ...opts, allowlistData: { ...ALLOWLIST, not_yet_instrumented: [] } });
    assert.deepEqual(failuresOf(r).map((f) => f.subject), ["chat_send_cancelled (ios)"]);
    assert.deepEqual(r.evaluation.declaredNotEmitted.ios, ["chat_send_cancelled"]);
  } finally { cleanup(); }
});

test("an emitted name not in the contract fails check 4 with file:line", () => {
  const { opts, cleanup } = fixture({
    "ios/Features/Drift.swift": `func x() async {\n    await AnalyticsService.shared.capture("feed_view")\n}\n`,
  });
  try {
    const f = failuresOf(run(opts), 4);
    assert.equal(f.length, 1);
    assert.equal(f[0].subject, "feed_view (ios)");
    assert.match(f[0].fix, /Drift\.swift:2 but not in the contract/);
  } finally { cleanup(); }
});

test("a name declared only for the other platform fails check 4", () => {
  const { opts, cleanup } = fixture({
    "ios/Features/Media.swift": `func x() async { await AnalyticsService.shared.capture("image_sent") }\n`,
  });
  try {
    const f = failuresOf(run(opts), 4);
    assert.match(f[0].fix, /in the contract but not for ios/);
  } finally { cleanup(); }
});

test("an unresolved dynamic call site fails and cannot be allowlisted away", () => {
  const { opts, cleanup } = fixture({
    "android/feature/x/src/main/kotlin/Dyn.kt": `fun x(repo: Repo) {\n    AnalyticsBridge.capture(repo.eventName())\n    AnalyticsBridge.capture("dyn_\${repo.kind}")\n}\n`,
  });
  try {
    const r = run(opts);
    const f = failuresOf(r, "parse");
    assert.equal(f.length, 2);
    assert.match(f[0].fix, /Dyn\.kt:2/);
    assert.match(f[1].fix, /interpolated event name/);
    assert.equal(r.scans.android.sites.filter((s) => s.kind === "unresolved").length, 2);
  } finally { cleanup(); }
});

test("interpolation outside the journey helper is not covered by the journey rule", () => {
  const { opts, cleanup } = fixture({
    "ios/Features/Fake.swift": `func x(journey: String) async { await AnalyticsService.shared.capture("\\(journey)_started") }\n`,
  });
  try {
    assert.equal(failuresOf(run(opts), "parse").length, 1);
  } finally { cleanup(); }
});

test("a capture call on an unknown receiver fails rather than being skipped", () => {
  const { opts, cleanup } = fixture({
    "ios/Features/Other.swift": `func x(a: Tracker) { a.capture("sneaky_event") }\n`,
  });
  try {
    const f = failuresOf(run(opts), "parse");
    assert.equal(f.length, 1);
    assert.match(f[0].fix, /does not recognise as an emitter/);
  } finally { cleanup(); }
});

test("stale allowlist entries are reported but do not fail", () => {
  const { opts, cleanup } = fixture();
  try {
    const data = { ...ALLOWLIST, undeclared: [{ event: "gone_event", platform: "ios", reason: "r", bead: "b" }] };
    const r = run({ ...opts, allowlistData: data });
    assert.deepEqual(r.evaluation.failures, []);
    assert.equal(r.evaluation.stale.length, 1);
  } finally { cleanup(); }
});

test("tokenize blanks comments and strings but keeps interpolation visible as a flag", () => {
  const { code, strings } = tokenize(`a("x(y") // c(\nb("\\(j)_s")`, "swift");
  assert.equal(code.split("(").length - 1, 2);
  assert.deepEqual(strings.map((s) => s.interpolated), [false, true]);
});

test("CLI exits 0 on pass, 1 on a gap, 2 on unreadable input, and --json is valid", () => {
  const { opts, root, cleanup } = fixture();
  try {
    const args = ["--ios-contract", opts.iosContract, "--android-contract", opts.androidContract, "--ios", opts.ios, "--android", opts.android, "--allowlist", opts.allowlist];
    const ok = spawnSync(process.execPath, [SCRIPT, ...args]);
    assert.equal(ok.status, 0, ok.stderr.toString());
    assert.match(ok.stdout.toString(), /## PASS/);
    const json = spawnSync(process.execPath, [SCRIPT, ...args, "--json"]);
    assert.equal(JSON.parse(json.stdout.toString()).ok, true);

    writeFileSync(join(root, "allow1.json"), JSON.stringify({ ...ALLOWLIST, events: [] }));
    const gap = spawnSync(process.execPath, [SCRIPT, ...args.slice(0, -1), join(root, "allow1.json")]);
    assert.equal(gap.status, 1);
    assert.match(gap.stdout.toString(), /## FAIL/);

    writeFileSync(join(root, "bad.json"), "{");
    const bad = spawnSync(process.execPath, [SCRIPT, ...args.slice(0, -1), join(root, "bad.json")]);
    assert.equal(bad.status, 2);
    assert.equal(spawnSync(process.execPath, [SCRIPT, "--bogus"]).status, 2);
  } finally { cleanup(); }
});

// Review fixes, 2026-09-24.

test("a journey outcome on a same-named local in another function is not credited", () => {
  const app = FILES["ios/App/App.swift"] + `
func unrelated() async {
    var attempt = SomethingElse()
    await attempt.cancelled()
}
`;
  const { opts, cleanup } = fixture({ "ios/App/App.swift": app });
  try {
    const r = run(opts);
    assert.ok(!r.evaluation.emitted.ios.has("chat_send_cancelled"), "cancelled() in another function must not settle the chat_send attempt");
  } finally { cleanup(); }
});

test("an Android test helper under src/main is not scanned as a real emitter", () => {
  const { opts, cleanup } = fixture({
    "android/app/src/main/java/AnalyticsTestHelper.kt": `fun fake() { AnalyticsBridge.capture("helper_only_event") }\n`,
  });
  try {
    const r = run(opts);
    const hit = r.evaluation.failures.some((f) => JSON.stringify(f).includes("helper_only_event"));
    assert.ok(!hit, "a test helper's fake event must not reach the gate");
    assert.ok(!r.evaluation.emitted.android.has("helper_only_event"));
  } finally { cleanup(); }
});

test("a malformed contract exits 2, not 0", () => {
  const { opts, cleanup } = fixture();
  try {
    writeFileSync(opts.iosContract, "{");
    const args = ["--ios-contract", opts.iosContract, "--android-contract", opts.androidContract, "--ios", opts.ios, "--android", opts.android, "--allowlist", opts.allowlist];
    assert.equal(spawnSync(process.execPath, [SCRIPT, ...args]).status, 2);
  } finally { cleanup(); }
});
