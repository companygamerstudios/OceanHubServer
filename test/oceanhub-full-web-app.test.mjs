import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => readFile(path.join(root, relative), "utf8");

test("the OceanHub Tauri app opens the full official site through the shared versioned launch route", async () => {
  const config = JSON.parse(await read("apps/oceanhub-app/src-tauri/tauri.conf.json"));
  const expected = "https://oceanhud.yoelenmanuelzorrilla.workers.dev/app-launch?clientVersion=3.0.2";

  assert.equal(config.productName, "OceanHub");
  assert.equal(config.identifier, "com.companygamerstudios.oceanhub");
  assert.equal(config.build.devUrl, expected);
  assert.equal(config.app.windows.length, 1);
  assert.equal(config.app.windows[0].url, expected);
  assert.equal(new URL(config.app.windows[0].url).protocol, "https:");
  assert.ok(config.bundle.icon.includes("icons/icon.png"));
  assert.deepEqual(config.bundle.targets, ["nsis"]);
  assert.equal(config.bundle.android.minSdkVersion, 24);
  assert.equal(config.bundle.android.versionCode, 3000003);
  assert.equal(config.version, "3.0.2");
  const versionPolicy = await read("apps/oceanhub-app/src/version-policy.js");
  assert.match(versionPolicy, /APP_CLIENT_VERSION = "3.0.2"/);
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

test("the Android workflow builds preview APKs only outside main and requires explicit stable release dispatch", async () => {
  const workflow = await read(".github/workflows/oceanhub-native-validation.yml");
  assert.ok(workflow.includes("npm run icons:android"));
  assert.ok(workflow.includes("actions/upload-artifact@v7"));
  assert.ok(workflow.includes("archive: false"));
  assert.ok(workflow.includes("OceanHub-Android-arm64-preview.apk"));
  assert.ok(workflow.includes("if: github.ref != 'refs/heads/main'"));
  assert.ok(workflow.includes("default: false"));
  assert.ok(workflow.includes("v3.0.2"));
  assert.ok(workflow.includes("Validate manual release tag matches app version"));
  assert.equal(workflow.includes("Resolve release tag for version bump"), false);
});

test("Windows CI and stable release generate platform icons and validate the installer", async () => {
  const validation = await read(".github/workflows/oceanhub-windows-exe.yml");
  const release = await read(".github/workflows/oceanhub-windows-release.yml");
  assert.ok(validation.includes("npm run icons:windows"));
  assert.ok(validation.includes("--bundles nsis"));
  assert.ok(validation.includes("OceanHub-Setup-Windows-x64.exe"));
  assert.ok(release.includes("npm run icons:windows"));
  assert.ok(release.includes("Verify release tag matches app version"));
  assert.ok(release.includes("OceanHub-Setup-*-x64.exe"));
  assert.ok(release.includes("v3.0.2"));
  assert.equal(release.includes("\n  push:\n"), false);
});

test("the startup splash is injected locally and handles quick page loads", async () => {
  const splash = await read("apps/oceanhub-app/src-tauri/loading-splash.js");
  const native = await read("apps/oceanhub-app/src-tauri/src/lib.rs");
  const packageJson = JSON.parse(await read("apps/oceanhub-app/package.json"));
  assert.ok(splash.includes("MIN_SPLASH_MS = 1200"));
  assert.ok(splash.includes('document.readyState === "complete"'));
  assert.ok(splash.includes("oceanhub-startup-splash"));
  assert.ok(native.includes("startup_splash_plugin()"));
  assert.ok(native.includes('include_str!("../loading-splash.js")'));
  assert.ok(packageJson.scripts.build.includes("loading-splash.js"));
});

test("production deployment requires an explicit manual dispatch from main", async () => {
  const workflow = await read(".github/workflows/deploy-production.yml");
  assert.ok(workflow.includes("workflow_dispatch:"));
  assert.equal(workflow.includes("  push:"), false);
  assert.ok(workflow.includes("El despliegue de producción solo se permite desde main."));
  assert.ok(workflow.includes("node preflight_deploy_v18.mjs production"));
  assert.ok(workflow.includes("npx wrangler deploy --config wrangler.production_v18.jsonc"));
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
