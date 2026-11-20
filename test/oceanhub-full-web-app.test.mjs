import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => readFile(path.join(root, relative), "utf8");

test("the Android Tauri app opens the complete official OceanHub website", async () => {
  const config = JSON.parse(await read("apps/oceanhub-app/src-tauri/tauri.conf.json"));
  const expected = "https://oceanhud.yoelenmanuelzorrilla.workers.dev/";

  assert.equal(config.productName, "OceanHub");
  assert.equal(config.identifier, "com.companygamerstudios.oceanhub");
  assert.equal(config.build.devUrl, expected);
  assert.equal(config.app.windows.length, 1);
  assert.equal(config.app.windows[0].url, expected);
  assert.equal(new URL(config.app.windows[0].url).protocol, "https:");
  assert.ok(config.bundle.icon.includes("icons/icon.png"));
  assert.deepEqual(config.bundle.targets, []);
  assert.equal(config.bundle.android.minSdkVersion, 24);
  assert.equal(config.bundle.android.versionCode, 3000000);
});

test("the Android build validates the installed app identity and launcher entry", async () => {
  const workflow = await read(".github/workflows/oceanhub-native-validation.yml");
  const cargo = await read("apps/oceanhub-app/src-tauri/Cargo.toml");
  assert.match(cargo, /\[profile\.dev\][\s\S]*debug = 0[\s\S]*strip = "debuginfo"/);

  assert.match(workflow, /com\.companygamerstudios\.oceanhub/);
  assert.match(workflow, /application-label:'OceanHub'/);
  assert.match(workflow, /launchable-activity/);
  assert.ok(workflow.includes('application-icon-[0-9]+:'), 'workflow must verify an APK launcher icon');
});

test("the native workflow uploads one raw APK and contains no Windows installer job", async () => {
  const workflow = await read(".github/workflows/oceanhub-native-validation.yml");

  assert.match(workflow, /actions\/upload-artifact@v7/);
  assert.match(workflow, /archive:\s*false/);
  assert.match(workflow, /OceanHub-Android-arm64-preview\.apk/);
  assert.doesNotMatch(workflow, /windows-test-installers|\.exe|\.msi/);
});

test("remote OceanHub web content receives no Tauri IPC capability", async () => {
  const capability = JSON.parse(await read("apps/oceanhub-app/src-tauri/capabilities/default.json"));

  assert.deepEqual(capability.permissions, ["core:default"]);
  assert.equal(Object.hasOwn(capability, "remote"), false);
});

test("the local app entry is only a launch fallback, not a mocked module prototype", async () => {
  const source = await read("apps/oceanhub-app/src/main.ts");

  assert.match(source, /OCEANHUB_WEB_URL/);
  assert.match(source, /Abrir OceanHub/);
  assert.doesNotMatch(source, /const VIEWS\s*:/);
  assert.doesNotMatch(source, /function moduleMarkup/);
  assert.doesNotMatch(source, /Integración por fases/);
});

test("the app fallback declares a mobile viewport and safe-area support", async () => {
  const html = await read("apps/oceanhub-app/index.html");

  assert.match(html, /name="viewport"/);
  assert.match(html, /viewport-fit=cover/);
});

test("the existing OceanHub website retains responsive layouts in Android WebView", async () => {
  const worker = await read("OceanHub_SECURITY_PATCHED_FINAL_v18.js");

  assert.match(worker, /@media\(max-width:820px\)/);
  assert.match(worker, /@media\(max-width:480px\)/);
  assert.match(worker, /viewport-fit=cover/);
  assert.match(worker, /<meta name="viewport"/);
  assert.match(worker, /@media \(max-width:520px\)/);
  assert.match(worker, /function socialShell\(/);
});
