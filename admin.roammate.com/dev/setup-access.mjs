#!/usr/bin/env node
/**
 * One-shot Cloudflare Access setup for the admin console.
 *
 *   node dev/setup-access.mjs            # do it
 *   node dev/setup-access.mjs --dry-run  # show what it would do, change nothing
 *
 * Reads the Access token from ~/.roammate-secrets/cloudflare-access.env (var
 * CLOUDFLARE_ACCESS_TOKEN) and the Pages token from wrangler's own OAuth config.
 * Two tokens because the wrangler OAuth token has pages:write but no Zero Trust
 * scope, which is exactly what blocked doing this by hand.
 *
 * IDEMPOTENT. Every step looks before it creates, so re-running after a partial
 * failure resumes rather than duplicating. An Access application per hostname is
 * not a nicety: an Access policy protects ONE hostname, and the Pages project is
 * reachable at both admin.roammate.com and roammate-admin.pages.dev.
 *
 * ORDER IS DELIBERATE. Access is configured BEFORE the API secrets are set, so
 * there is never a window in which the console can reach real data without
 * authentication in front of it. The middleware fails closed throughout.
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ACCOUNT = '3e8792b00414eadb1cde0e891c393317';
const PROJECT = 'roammate-admin';
const PRIMARY_HOST = 'admin.roammate.com';
/**
 * THREE hostnames, not one. An Access policy protects exactly the hostname it
 * names. The Pages project answers on its bare .pages.dev address AND on a
 * per-deployment subdomain (dad895b0.roammate-admin.pages.dev), so a policy on
 * the custom domain alone leaves two ways in. The account's existing Horizon
 * apps are configured the same way, which is where this pattern comes from.
 */
const HOSTS = ['admin.roammate.com', `${PROJECT}.pages.dev`, `*.${PROJECT}.pages.dev`];
/**
 * The single operator address. Keep this list minimal and current: re-running
 * this script REWRITES the allow policy, so a stale address here silently
 * re-grants access to a mailbox that should no longer have it.
 */
const ALLOWED_EMAILS = ['dan@roammate.com'];
const API_BASE_URL = 'https://api.roammate.com';
const DRY = process.argv.includes('--dry-run');

const SECRET_FILE = join(homedir(), '.roammate-secrets', 'cloudflare-access.env');

function die(msg, extra) {
  console.error(`\n  FAILED: ${msg}`);
  if (extra) console.error(`  ${extra}`);
  process.exit(1);
}

function readAccessToken() {
  if (process.env.CLOUDFLARE_ACCESS_TOKEN) return process.env.CLOUDFLARE_ACCESS_TOKEN.trim();
  if (!existsSync(SECRET_FILE)) {
    die(`no Access token found`,
      `Create one at dash.cloudflare.com > Manage Account > API Tokens with\n` +
      `    Account > Access: Apps and Policies > Edit\n` +
      `    Account > Access: Organizations, Identity Providers, and Groups > Edit\n` +
      `  then:  mkdir -p ~/.roammate-secrets\n` +
      `         printf 'CLOUDFLARE_ACCESS_TOKEN=%s\\n' '<token>' > ${SECRET_FILE}\n` +
      `         chmod 600 ${SECRET_FILE}`);
  }
  const m = readFileSync(SECRET_FILE, 'utf8').match(/^\s*CLOUDFLARE_ACCESS_TOKEN\s*=\s*(.+)$/m);
  if (!m) die(`${SECRET_FILE} has no CLOUDFLARE_ACCESS_TOKEN= line`);
  return m[1].trim().replace(/^["']|["']$/g, '');
}

function readWranglerToken() {
  const p = join(homedir(), '.wrangler', 'config', 'default.toml');
  if (!existsSync(p)) die('wrangler is not logged in', 'run: npx wrangler login');
  const m = readFileSync(p, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!m) die('no oauth_token in wrangler config', 'run: npx wrangler login');
  return m[1];
}

async function cf(token, path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  let body;
  try { body = await res.json(); } catch { body = { success: false, errors: [{ message: `HTTP ${res.status}` }] }; }
  return body;
}

function fail(label, body) {
  const errs = (body.errors || []).map((e) => `${e.code ?? '?'} ${e.message ?? '(no message)'}`).join('; ');
  die(`${label}`, errs || 'no error detail returned');
}

const step = (n, s) => console.log(`\n[${n}] ${s}`);

async function main() {
  const accessToken = readAccessToken();
  const pagesToken = readWranglerToken();
  console.log(`Cloudflare Access setup for ${PRIMARY_HOST}${DRY ? '  (DRY RUN)' : ''}`);

  // -- 1. token sanity, before anything is created -------------------------
  step(1, 'Checking the Access token has the scopes this needs');
  const orgs = await cf(accessToken, `/accounts/${ACCOUNT}/access/organizations`);
  if (!orgs.success) {
    fail('cannot read Zero Trust organisation — the token is missing "Access: Organizations, Identity Providers, and Groups > Edit"', orgs);
  }

  // -- 2. organisation / team domain ---------------------------------------
  // Never creates one. An organisation already exists on this account and its
  // auth_domain is effectively permanent -- other applications authenticate
  // against it, so replacing it would break them.
  step(2, 'Zero Trust organisation');
  const authDomain = orgs.result?.auth_domain;
  if (!authDomain) {
    die('no Zero Trust organisation on this account',
      'Create one once in the dashboard (Zero Trust > Settings), then re-run. ' +
      'It requires choosing a permanent team domain, which is not a decision to automate.');
  }
  console.log(`    using existing: ${authDomain}`);

  // One-time PIN, per the chosen login method. Pinning allowed_idps means adding
  // another provider later cannot silently widen who can reach this console.
  const idps = await cf(accessToken, `/accounts/${ACCOUNT}/access/identity_providers`);
  if (!idps.success) fail('could not list identity providers', idps);
  const pin = (idps.result || []).find((i) => i.type === 'onetimepin');
  if (!pin) die('One-time PIN is not enabled on this account', 'Zero Trust > Settings > Authentication');
  console.log(`    login method: One-time PIN (${pin.id})`);

  // -- 3. applications, one per hostname ------------------------------------
  const existing = await cf(accessToken, `/accounts/${ACCOUNT}/access/apps`);
  if (!existing.success) fail('could not list Access applications', existing);

  const auds = {};
  for (const [i, host] of HOSTS.entries()) {
    step(`3.${i + 1}`, `Access application for ${host}`);
    let app = (existing.result || []).find((a) => a.domain === host);
    if (app) {
      console.log(`    exists: ${app.id}`);
    } else if (DRY) {
      console.log('    would create (self_hosted, 24h session, launcher hidden)');
      auds[host] = '(dry-run)';
      continue;
    } else {
      const made = await cf(accessToken, `/accounts/${ACCOUNT}/access/apps`, {
        method: 'POST',
        body: JSON.stringify({
          name: `roammate admin console (${host})`,
          domain: host,
          type: 'self_hosted',
          session_duration: '24h',
          app_launcher_visible: false,
          auto_redirect_to_identity: false,
          allowed_idps: [pin.id],
        }),
      });
      if (!made.success) fail(`could not create the Access application for ${host}`, made);
      app = made.result;
      console.log(`    created: ${app.id}`);
    }
    auds[host] = app.aud;

    // -- policy: allow only the named operators ----------------------------
    const pols = await cf(accessToken, `/accounts/${ACCOUNT}/access/apps/${app.id}/policies`);
    const already = (pols.result || []).some((p) => p.decision === 'allow');
    if (already) {
      console.log('    allow policy already present');
    } else if (DRY) {
      console.log(`    would add allow policy for: ${ALLOWED_EMAILS.join(', ')}`);
    } else {
      const pol = await cf(accessToken, `/accounts/${ACCOUNT}/access/apps/${app.id}/policies`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'roammate operators',
          decision: 'allow',
          include: ALLOWED_EMAILS.map((email) => ({ email: { email } })),
        }),
      });
      if (!pol.success) fail(`could not create the allow policy for ${host}`, pol);
      console.log(`    allow policy created for: ${ALLOWED_EMAILS.join(', ')}`);
    }
  }

  // -- 4. Pages secrets, LAST ------------------------------------------------
  // Only now, with Access in front of both hostnames, does the console get the
  // credentials that let it reach real data.
  step(4, 'Pages secrets (set last, so data is never reachable before auth exists)');
  const vars = {
    API_BASE_URL: { value: API_BASE_URL, type: 'plain_text' },
    ADMIN_API_KEY: { value: process.env.ROAMMATE_ADMIN_API_KEY || '', type: 'secret_text' },
    ACCESS_TEAM_DOMAIN: { value: authDomain, type: 'plain_text' },
    // The primary host's AUD only. The two pages.dev applications exist to block
    // at the edge, not to grant: a token minted for them carries a different aud
    // and the middleware rejects it. Reaching the console means admin.roammate.com.
    ACCESS_AUD: { value: auds[PRIMARY_HOST], type: 'secret_text' },
  };
  if (!vars.ADMIN_API_KEY.value) {
    console.log('    SKIPPED ADMIN_API_KEY: set ROAMMATE_ADMIN_API_KEY in the environment and re-run.');
    console.log('    The console stays at 503 until it is set, which is correct.');
    delete vars.ADMIN_API_KEY;
  }
  if (DRY) {
    console.log('    would set: ' + Object.keys(vars).join(', '));
  } else {
    const patch = await cf(pagesToken, `/accounts/${ACCOUNT}/pages/projects/${PROJECT}`, {
      method: 'PATCH',
      body: JSON.stringify({ deployment_configs: { production: { env_vars: vars } } }),
    });
    if (!patch.success) fail('could not set Pages secrets', patch);
    console.log('    set: ' + Object.keys(vars).join(', '));
  }

  console.log('\nDone.');
  console.log(`  team domain : ${authDomain}`);
  for (const [h, a] of Object.entries(auds)) console.log(`  AUD ${h.padEnd(26)} ${a}`);
  console.log('\nNext: redeploy so the new secrets are picked up, then confirm that an');
  console.log('unauthenticated request to https://' + PRIMARY_HOST + '/ is REFUSED.');
}

main().catch((e) => die(e.message, e.stack));
