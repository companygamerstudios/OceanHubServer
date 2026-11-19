import test from 'node:test';
import assert from 'node:assert/strict';
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
  assert.match(await withNotice.text(), /oceanhub-version-monitor/);
  const json = new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json' } });
  const unchanged = await injectAppUpdateNotice(json, true);
  assert.equal(await unchanged.text(), '{"ok":true}');
});
