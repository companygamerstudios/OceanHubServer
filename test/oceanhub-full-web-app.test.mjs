import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => readFile(path.join(root, relative), "utf8");

test("Windows and Android Tauri windows open the complete official OceanHub web app", async () => {
  const config = JSON.parse(await read("apps/oceanhub-app/src-tauri/tauri.conf.json"));
  const expected = "https://oceanhud.yoelenmanuelzorrilla.workers.dev/";

  assert.equal(config.build.devUrl, expected);
  assert.equal(config.app.windows.length, 1);
  assert.equal(config.app.windows[0].url, expected);
  assert.equal(new URL(config.app.windows[0].url).protocol, "https:");
});

test("remote OceanHub web content receives no Tauri IPC capability", async () => {
  const capability = JSON.parse(await read("apps/oceanhub-app/src-tauri/capabilities/default.json"));

  assert.deepEqual(capability.permissions, ["core:default"]);
  assert.equal(Object.hasOwn(capability, "remote"), false);
});

test("the local app entry is only a launch fallback, not the old mocked module prototype", async () => {
  const source = await read("apps/oceanhub-app/src/main.ts");

  assert.match(source, /OCEANHUB_WEB_URL/);
  assert.match(source, /Abrir OceanHub/);
  assert.doesNotMatch(source, /const VIEWS\s*:/);
  assert.doesNotMatch(source, /function moduleMarkup/);
  assert.doesNotMatch(source, /Integración por fases/);
});

test("the app fallback declares mobile viewport and safe-area support", async () => {
  const html = await read("apps/oceanhub-app/index.html");

  assert.match(html, /name="viewport"/);
  assert.match(html, /viewport-fit=cover/);
});


test("the existing OceanHub website keeps responsive layouts in the native WebView", async () => {
  const worker = await read("OceanHub_SECURITY_PATCHED_FINAL_v18.js");

  // The full homepage has dedicated tablet and phone breakpoints.
  assert.match(worker, /@media\(max-width:820px\)/);
  assert.match(worker, /@media\(max-width:480px\)/);
  assert.match(worker, /viewport-fit=cover/);

  // The sign-in and social pages also declare mobile viewport metadata.
  assert.match(worker, /<meta name="viewport"/);
  assert.match(worker, /@media \(max-width:520px\)/);
  assert.match(worker, /function socialShell\(/);
});
