import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  PermissionConfig,
  PermissionOverrides,
  PermissionPrefixMapping,
} from "./interfaces";

export interface StoredCommandApproval {
  kind: "exact" | "prefix";
  tokens: string[];
}

const settingsPath = () => join(getAgentDir(), "settings.json");

const loadSettings = (): Record<string, unknown> => {
  try {
    const settings = JSON.parse(readFileSync(settingsPath(), "utf8"));
    return settings && typeof settings === "object" ? settings : {};
  } catch {
    return {};
  }
};

const saveSettings = (settings: Record<string, unknown>): void => {
  const path = settingsPath();
  const temporaryPath = `${path}.tmp`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`);
  renameSync(temporaryPath, path);
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const validateOverrides = (value: unknown): PermissionOverrides | undefined => {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const overrides: PermissionOverrides = {};
  for (const level of ["minimal", "low", "medium", "high", "dangerous"] as const) {
    if (isStringArray(raw[level])) overrides[level] = raw[level];
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined;
};

const validatePrefixMappings = (value: unknown): PermissionPrefixMapping[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((mapping): mapping is PermissionPrefixMapping => {
    if (!mapping || typeof mapping !== "object") return false;
    const candidate = mapping as { from?: unknown; to?: unknown };
    return (
      typeof candidate.from === "string" &&
      candidate.from.length > 0 &&
      typeof candidate.to === "string"
    );
  });
};

const isStoredCommandApproval = (
  value: unknown,
): value is StoredCommandApproval => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { kind?: unknown; tokens?: unknown };
  return (
    (candidate.kind === "exact" || candidate.kind === "prefix") &&
    Array.isArray(candidate.tokens) &&
    candidate.tokens.length > 0 &&
    candidate.tokens.length <= 32 &&
    candidate.tokens.every(
      (token) => typeof token === "string" && token.length > 0 && token.length <= 512,
    )
  );
};

/** Load only the classifier customisation still used by session approvals. */
export const loadPermissionConfig = (): PermissionConfig => {
  const raw = loadSettings().permissionConfig;
  if (!raw || typeof raw !== "object") return {};

  const config = raw as Record<string, unknown>;
  const overrides = validateOverrides(config.overrides);
  const prefixMappings = validatePrefixMappings(config.prefixMappings);
  return {
    ...(overrides ? { overrides } : {}),
    ...(prefixMappings.length > 0 ? { prefixMappings } : {}),
  };
};

/** Load user-approved command scopes that apply to every Pi session. */
export const loadGlobalCommandApprovals = (): StoredCommandApproval[] => {
  const approvals = loadSettings().commandApprovals;
  if (!Array.isArray(approvals)) return [];
  return approvals.filter(isStoredCommandApproval).slice(0, 200);
};

/** Persist user-approved command scopes without changing unrelated settings. */
export const saveGlobalCommandApprovals = (
  approvals: StoredCommandApproval[],
): void => {
  const validApprovals = approvals.filter(isStoredCommandApproval).slice(0, 200);
  const settings = loadSettings();
  settings.commandApprovals = validApprovals;
  saveSettings(settings);
};
