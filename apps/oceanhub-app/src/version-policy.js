export const APP_CLIENT_VERSION = "3.0.2";
export const VERSION_POLICY_CACHE_KEY = "oceanhub.public-version-policy.v1";
export const VERSION_POLICY_ENDPOINT = "https://oceanhud.yoelenmanuelzorrilla.workers.dev/api/app/version";

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function parseVersion(value) {
  if (typeof value !== "string") return null;
  const match = VERSION_PATTERN.exec(value.trim());
  if (!match) return null;
  return {
    core: match.slice(1, 4).map(Number),
    prerelease: match[4] ? match[4].split(".") : null
  };
}

function compareIdentifiers(left, right) {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) {
    const a = left.replace(/^0+(?=\d)/, "");
    const b = right.replace(/^0+(?=\d)/, "");
    if (a.length !== b.length) return a.length < b.length ? -1 : 1;
    return a === b ? 0 : a < b ? -1 : 1;
  }
  if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
  return left === right ? 0 : left < right ? -1 : 1;
}

export function compareSemVer(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) return a.core[index] < b.core[index] ? -1 : 1;
  }
  if (!a.prerelease && !b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  const length = Math.min(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const compared = compareIdentifiers(a.prerelease[index], b.prerelease[index]);
    if (compared !== 0) return compared;
  }
  if (a.prerelease.length === b.prerelease.length) return 0;
  return a.prerelease.length < b.prerelease.length ? -1 : 1;
}

function normalizePolicy(value) {
  if (!value || typeof value !== "object") return null;
  const version = typeof value.version === "string" ? value.version : "";
  const minimumSupportedVersion = typeof value.minimumSupportedVersion === "string"
    ? value.minimumSupportedVersion
    : "";
  if (compareSemVer(version, version) !== 0 || compareSemVer(minimumSupportedVersion, minimumSupportedVersion) !== 0) return null;
  if (compareSemVer(minimumSupportedVersion, version) > 0) return null;
  if (typeof value.channel !== "string" || !value.channel.trim()) return null;
  if (typeof value.downloadUrl !== "string") return null;
  try {
    const endpoint = new URL(VERSION_POLICY_ENDPOINT);
    const download = new URL(value.downloadUrl, endpoint);
    if (download.origin !== endpoint.origin || download.pathname !== "/download") return null;
  } catch {
    return null;
  }
  return {
    name: typeof value.name === "string" ? value.name : "OceanHub",
    version,
    minimumSupportedVersion,
    channel: value.channel,
    downloadUrl: value.downloadUrl,
    releaseNotes: typeof value.releaseNotes === "string" ? value.releaseNotes : ""
  };
}

export function getVersionDecision(clientVersion, policy) {
  if (compareSemVer(clientVersion, clientVersion) !== 0) return "unknown";
  const normalized = normalizePolicy(policy);
  if (!normalized) return "unknown";
  if (compareSemVer(clientVersion, normalized.minimumSupportedVersion) < 0) return "required";
  if (compareSemVer(clientVersion, normalized.version) < 0) return "available";
  return "current";
}

function resolveStorage(supplied) {
  if (supplied !== undefined) return supplied;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readCachedPolicy(storage) {
  if (!storage || typeof storage.getItem !== "function") return null;
  try {
    const raw = storage.getItem(VERSION_POLICY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const policy = normalizePolicy(parsed?.policy);
    if (!policy) return null;
    return {
      policy,
      checkedAt: typeof parsed.checkedAt === "string" ? parsed.checkedAt : null
    };
  } catch {
    return null;
  }
}

function writeCachedPolicy(storage, policy, checkedAt) {
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(VERSION_POLICY_CACHE_KEY, JSON.stringify({ policy, checkedAt }));
  } catch {
    // The version check remains useful when browser storage is unavailable.
  }
}

export async function checkVersionPolicy(options = {}) {
  const clientVersion = options.clientVersion ?? APP_CLIENT_VERSION;
  const fetcher = options.fetcher ?? (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
  const storage = resolveStorage(options.storage);
  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 8000;
  const cached = readCachedPolicy(storage);

  if (compareSemVer(clientVersion, clientVersion) !== 0 || typeof fetcher !== "function") {
    return {
      connectivity: "offline",
      decision: cached ? getVersionDecision(clientVersion, cached.policy) : "unknown",
      policy: cached?.policy ?? null,
      checkedAt: cached?.checkedAt ?? null
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(VERSION_POLICY_ENDPOINT, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response || !response.ok) throw new Error("Version endpoint unavailable");
    const contentType = response.headers?.get?.("Content-Type") || "";
    if (!contentType.toLowerCase().includes("application/json")) throw new Error("Invalid version content type");
    const policy = normalizePolicy(await response.json());
    if (!policy) throw new Error("Invalid version policy");
    const checkedAt = new Date().toISOString();
    writeCachedPolicy(storage, policy, checkedAt);
    return {
      connectivity: "online",
      decision: getVersionDecision(clientVersion, policy),
      policy,
      checkedAt
    };
  } catch {
    return {
      connectivity: "offline",
      decision: cached ? getVersionDecision(clientVersion, cached.policy) : "unknown",
      policy: cached?.policy ?? null,
      checkedAt: cached?.checkedAt ?? null
    };
  } finally {
    clearTimeout(timeout);
  }
}
