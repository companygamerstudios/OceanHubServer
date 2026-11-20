export interface VersionPolicy {
  name: string;
  version: string;
  minimumSupportedVersion: string;
  channel: string;
  downloadUrl: string;
  releaseNotes: string;
}

export type VersionDecision = "current" | "available" | "required" | "unknown";

export interface VersionCheckResult {
  connectivity: "online" | "offline";
  decision: VersionDecision;
  policy: VersionPolicy | null;
  checkedAt: string | null;
}

export const APP_CLIENT_VERSION: string;
export const VERSION_POLICY_CACHE_KEY: string;
export const VERSION_POLICY_ENDPOINT: string;

export function compareSemVer(left: string, right: string): -1 | 0 | 1 | null;
export function getVersionDecision(clientVersion: string, policy: unknown): VersionDecision;
export function checkVersionPolicy(options?: {
  clientVersion?: string;
  fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  timeoutMs?: number;
}): Promise<VersionCheckResult>;
