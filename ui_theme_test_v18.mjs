import assert from 'node:assert/strict';
import { applySecurityHeaders } from './OceanHub_SECURITY_PATCHED_FINAL_v18.js';

const html = '<!doctype html><html><head><title>test</title></head><body><h1>Ocean Hub test</h1></body></html>';
const secured = await applySecurityHeaders(new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
assert.equal(secured.status, 200);
assert.match(secured.headers.get('Content-Security-Policy') || '', /default-src 'self'/);
assert.match(secured.headers.get('Content-Security-Policy') || '', /object-src 'none'/);
assert.match(secured.headers.get('Content-Security-Policy') || '', /frame-ancestors 'none'/);
assert.equal(secured.headers.get('X-Content-Type-Options'), 'nosniff');
assert.equal(secured.headers.get('X-Frame-Options'), 'DENY');
assert.ok(secured.headers.get('Referrer-Policy'), 'Debe incluir Referrer-Policy');
assert.ok((await secured.text()).includes('ocean-hub-liquid-glass-v18'), 'Debe inyectar el tema Liquid Glass a HTML');

const json = await applySecurityHeaders(new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json' } }));
assert.equal(await json.text(), '{"ok":true}', 'No debe transformar el cuerpo JSON');
assert.equal(json.headers.get('X-Content-Type-Options'), 'nosniff');

console.log('ui_theme_test_v18: 10 comprobaciones de cabeceras/tema superadas.');
