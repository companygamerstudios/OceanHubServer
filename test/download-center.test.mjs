import test from 'node:test';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import {
  APP_VERSION,
  MINIMUM_SUPPORTED_VERSION,
  compareVersions,
  getAppVersionPayload,
  handleDownloadCenterRoute,
  injectAppUpdateNotice
} from '../download-center.js';

test('versiones semánticas comparan core y prerelease', () => {
  assert.equal(compareVersions('3.0.0', '3.0.1'), -1);
  assert.equal(compareVersions('3.0.0-preview.1', '3.0.0'), -1);
  assert.equal(compareVersions('3.1.0', '3.0.9'), 1);
  assert.equal(compareVersions('bad', '3.0.0'), null);
});

test('el manifiesto de versión contiene únicamente metadatos públicos', () => {
  const payload = getAppVersionPayload();
  assert.equal(payload.version, APP_VERSION);
  assert.equal(payload.minimumSupportedVersion, MINIMUM_SUPPORTED_VERSION);
  assert.equal(payload.downloadUrl, '/download');
  assert.equal('secrets' in payload, false);
});

test('el centro de descargas y sus endpoints son públicos', async () => {
  const page = await handleDownloadCenterRoute(new Request('https://example.test/download'));
  assert.equal(page.status, 200);
  assert.match(await page.text(), /WINDOWS 10 \/ 11/);
  const manifest = await handleDownloadCenterRoute(new Request('https://example.test/app.webmanifest'));
  assert.equal(manifest.headers.get('Content-Type').includes('manifest+json'), true);
  const sw = await handleDownloadCenterRoute(new Request('https://example.test/sw.js'));
  assert.equal(sw.headers.get('Service-Worker-Allowed'), '/');
  const version = await handleDownloadCenterRoute(new Request('https://example.test/api/app/version'));
  assert.equal((await version.json()).version, APP_VERSION);
});

test('el centro de descargas rechaza métodos de escritura', async () => {
  const response = await handleDownloadCenterRoute(new Request('https://example.test/download', { method: 'POST' }));
  assert.equal(response.status, 405);
});

test('el aviso de versión solo se añade a HTML cuando está habilitado', async () => {
  const html = new Response('<!doctype html><html><body><main>OceanHub</main></body></html>', {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
  const withNotice = await injectAppUpdateNotice(html, true);
  const updatedHtml = await withNotice.text();
  assert.match(updatedHtml, /oceanhub-version-monitor/);

  // Extract the generated script using literal delimiters. A regex literal here
  // previously had escaping errors and prevented the complete test file loading.
  const scriptMarker = '<script id="oceanhub-version-monitor">';
  const scriptStart = updatedHtml.indexOf(scriptMarker);
  const scriptEnd = updatedHtml.indexOf('</script>', scriptStart + scriptMarker.length);
  const updaterScript = scriptStart >= 0 && scriptEnd >= 0
    ? updatedHtml.slice(scriptStart + scriptMarker.length, scriptEnd)
    : null;

  assert.ok(updaterScript, 'el monitor debe incluir un script reconocible');
  assert.doesNotThrow(() => new Script(updaterScript), 'el script de actualización debe ser JavaScript válido');
  const json = new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json' } });
  const unchanged = await injectAppUpdateNotice(json, true);
  assert.equal(await unchanged.text(), '{"ok":true}');
});

test('la API de versión permite CORS solo al origen nativo Tauri y al Vite local', async () => {
  const native = await handleDownloadCenterRoute(new Request('https://example.test/api/app/version', {
    headers: { Origin: 'http://tauri.localhost' }
  }));
  assert.equal(native.status, 200);
  assert.equal(native.headers.get('Access-Control-Allow-Origin'), 'http://tauri.localhost');
  assert.equal(native.headers.get('Access-Control-Allow-Credentials'), null);
  assert.equal(native.headers.get('Vary'), 'Origin');

  const localDev = await handleDownloadCenterRoute(new Request('https://example.test/api/app/version', {
    headers: { Origin: 'http://127.0.0.1:1420' }
  }));
  assert.equal(localDev.headers.get('Access-Control-Allow-Origin'), 'http://127.0.0.1:1420');

  const untrusted = await handleDownloadCenterRoute(new Request('https://example.test/api/app/version', {
    headers: { Origin: 'https://untrusted.example' }
  }));
  assert.equal(untrusted.status, 200);
  assert.equal(untrusted.headers.get('Access-Control-Allow-Origin'), null);
});

test('la preflight de la API de versión limita el origen, el método y los encabezados', async () => {
  const allowed = await handleDownloadCenterRoute(new Request('https://example.test/api/app/version', {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://tauri.localhost',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'accept'
    }
  }));
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'http://tauri.localhost');
  assert.equal(allowed.headers.get('Access-Control-Allow-Methods'), 'GET, OPTIONS');

  const deniedOrigin = await handleDownloadCenterRoute(new Request('https://example.test/api/app/version', {
    method: 'OPTIONS',
    headers: { Origin: 'https://untrusted.example', 'Access-Control-Request-Method': 'GET' }
  }));
  assert.equal(deniedOrigin.status, 403);

  const deniedMethod = await handleDownloadCenterRoute(new Request('https://example.test/api/app/version', {
    method: 'OPTIONS',
    headers: { Origin: 'http://tauri.localhost', 'Access-Control-Request-Method': 'POST' }
  }));
  assert.equal(deniedMethod.status, 403);
});
