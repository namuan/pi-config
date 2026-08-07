import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  PermissionConfig,
  PermissionOverrides,
  PermissionPrefixMapping,
} from "./interfaces";

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

/** Load only the classifier customisation still used by session approvals. */
export const loadPermissionConfig = (): PermissionConfig => {
  try {
    const settings = JSON.parse(
      readFileSync(join(getAgentDir(), "settings.json"), "utf8"),
    ) as { permissionConfig?: unknown };
    const raw = settings.permissionConfig;
    if (!raw || typeof raw !== "object") return {};

    const config = raw as Record<string, unknown>;
    const overrides = validateOverrides(config.overrides);
    const prefixMappings = validatePrefixMappings(config.prefixMappings);
    return {
      ...(overrides ? { overrides } : {}),
      ...(prefixMappings.length > 0 ? { prefixMappings } : {}),
    };
  } catch {
    return {};
  }
};
