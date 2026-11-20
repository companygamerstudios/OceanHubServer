import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => readFile(path.join(root, relative), "utf8");

test("the Android workflow remains dedicated to Android APK builds", async () => {
  const workflow = await read(".github/workflows/oceanhub-native-validation.yml");
  assert.match(workflow, /Build signed Android arm64 release APK/);
  assert.match(workflow, /apksigner/);
  assert.match(workflow, /OceanHub-Android-arm64-release\.apk/);
  assert.doesNotMatch(workflow, /windows-test-installers|\.exe|\.msi/);
});

test("the Windows workflow builds and verifies a native x64 NSIS EXE installer", async () => {
  const workflow = await read(".github/workflows/oceanhub-windows-exe.yml");
  const pkg = JSON.parse(await read("apps/oceanhub-app/package.json"));
  const config = JSON.parse(await read("apps/oceanhub-app/src-tauri/tauri.conf.json"));

  assert.equal(pkg.scripts["tauri:windows:build"], "tauri build --bundles nsis");
  assert.match(workflow, /runs-on: windows-2022/);
  assert.match(workflow, /choco install nsis/);
  assert.match(workflow, /npm run tauri:windows:build/);
  assert.match(workflow, /bundle\\nsis/);
  assert.match(workflow, /OceanHub-Setup-3\.0\.0-x64\.exe/);
  assert.match(workflow, /actions\/upload-artifact@v7/);
  assert.match(workflow, /archive:\s*false/);
  assert.match(workflow, /softprops\/action-gh-release@v2/);
  assert.equal(config.productName, "OceanHub");
  assert.equal(config.identifier, "com.companygamerstudios.oceanhub");
  assert.equal(config.app.windows[0].url, "https://oceanhud.yoelenmanuelzorrilla.workers.dev/");
});

test("the README documents both official desktop and Android packages", async () => {
  const readme = await read("apps/oceanhub-app/README.md");
  assert.match(readme, /Windows.*EXE/i);
  assert.match(readme, /Android.*ARM64/i);
  assert.match(readme, /SmartScreen/);
});
