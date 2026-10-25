import assert from 'node:assert/strict';
import { injectOceanLiquidGlassTheme, applySecurityHeaders } from './OceanHub_SECURITY_PATCHED_FINAL_v18.js';

const html = '<!doctype html><html><head><title>Fixture</title></head><body><main>Ocean Hub</main></body></html>';
const themed = injectOceanLiquidGlassTheme(html);
assert.match(themed, /id="ocean-hub-liquid-glass-v18"/);
assert.ok(themed.indexOf('ocean-hub-liquid-glass-v18') < themed.indexOf('</head>'));
assert.equal(injectOceanLiquidGlassTheme(themed), themed, 'El tema no debe inyectarse duplicado.');
assert.equal(injectOceanLiquidGlassTheme('plain text'), 'plain text', 'No debe alterar texto que no sea HTML.');

const protectedResponse = await applySecurityHeaders(new Response(html, {
  headers: { 'Content-Type': 'text/html; charset=utf-8' }
}));
const csp = protectedResponse.headers.get('Content-Security-Policy') || '';
assert.match(csp, /default-src 'self'/);
assert.match(csp, /object-src 'none'/);
assert.match(csp, /frame-ancestors 'none'/);
assert.equal(protectedResponse.headers.get('X-Content-Type-Options'), 'nosniff');
assert.equal(protectedResponse.headers.get('X-Frame-Options'), 'DENY');
assert.match(protectedResponse.headers.get('Permissions-Policy') || '', /geolocation=\(\)/);
assert.match(await protectedResponse.text(), /ocean-hub-liquid-glass-v18/);

console.log('PASS ui_theme: inyección idempotente de tema, HTML intacto y cabeceras de seguridad.');
