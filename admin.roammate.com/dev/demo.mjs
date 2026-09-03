/**
 * One command to look at the console: `npm run demo`.
 *
 * Starts the mock API, then serves the built output under wrangler so it runs in
 * workerd exactly as it will in production. Config is passed as --binding rather
 * than written to .dev.vars, so running the demo never leaves a file behind that
 * could be confused with real credentials.
 *
 * DEV_BYPASS_ACCESS=1 skips Cloudflare Access verification. That is safe here
 * because wrangler binds to localhost only, and it is the ONLY way this flag
 * should ever be set. In production the middleware fails closed without it.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const MOCK_PORT = process.env.MOCK_PORT || '8788';
const PORT = process.env.PORT || '4331';
const KEY = 'demo-key';

if (!existsSync(new URL('../dist/_worker.js', import.meta.url))) {
  console.error('No build found. Run `npm run build` first (or use `npm run demo` which does).');
  process.exit(1);
}

const children = [];
function shutdown() {
  for (const c of children) {
    try { c.kill('SIGTERM'); } catch { /* already gone */ }
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const mock = spawn(process.execPath, [new URL('./mock-api.mjs', import.meta.url).pathname], {
  stdio: 'inherit',
  env: { ...process.env, MOCK_PORT, MOCK_ADMIN_KEY: KEY },
});
children.push(mock);

// Give the mock a moment to bind before the console starts fetching from it.
setTimeout(() => {
  const wrangler = spawn(
    'npx',
    [
      'wrangler', 'pages', 'dev', './dist',
      '--port', PORT,
      '--binding',
      `API_BASE_URL=http://localhost:${MOCK_PORT}`,
      `ADMIN_API_KEY=${KEY}`,
      'DEV_BYPASS_ACCESS=1',
    ],
    { stdio: 'inherit', env: process.env },
  );
  children.push(wrangler);
  wrangler.on('exit', shutdown);

  setTimeout(() => {
    console.log(`\n  Admin console prototype:  http://localhost:${PORT}\n`);
  }, 4000);
}, 700);
