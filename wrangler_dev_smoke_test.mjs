import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const port = 18787;
const url = `http://127.0.0.1:${port}/air-flow/status`;
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(command, [
  '--no-install','wrangler','dev','--local','--config','wrangler.jsonc',
  '--port',String(port),'--ip','127.0.0.1'
], {
  cwd: process.cwd(),
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  stdio: ['ignore','pipe','pipe'],
  windowsHide: true,
  shell: process.platform === 'win32'
});
let logs = '';
let exitInfo = null;
let spawnError = null;
child.stdout.on('data', chunk => { logs += chunk.toString(); });
child.stderr.on('data', chunk => { logs += chunk.toString(); });
child.once('error', error => { spawnError = error; });
const exited = new Promise(resolve => child.once('exit', (code, signal) => {
  exitInfo = { code, signal };
  resolve(exitInfo);
}));

try {
  const deadline = Date.now() + 25000;
  let response = null;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (exitInfo) throw new Error(`Wrangler terminó antes de arrancar (code=${exitInfo.code}, signal=${exitInfo.signal}).`);
    try {
      const candidate = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (candidate.status < 500) {
        response = candidate;
        break;
      }
    } catch (_) {}
    await delay(250);
  }
  assert.ok(response, 'Wrangler no respondió en 25 segundos.');
  assert.ok(response.status < 500, `El Worker local respondió HTTP ${response.status}.`);
  console.log(`wrangler_dev_smoke_test: Worker local arrancó y respondió HTTP ${response.status}; no se desplegó nada.`);
} catch (error) {
  console.error('wrangler_dev_smoke_test FAILED:', error?.message || error);
  console.error('Registro de Wrangler (sin secretos):\n' + logs.slice(-12000));
  process.exitCode = 1;
} finally {
  if (!exitInfo) child.kill('SIGTERM');
  await Promise.race([exited, delay(2000)]);
  if (!exitInfo) child.kill('SIGKILL');
}
