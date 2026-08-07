import type { PermissionLevel } from "./types";

/** Optional command-classification customisation from Pi settings. */
export interface PermissionConfig {
  overrides?: PermissionOverrides;
  prefixMappings?: PermissionPrefixMapping[];
}

export interface PermissionOverrides {
  minimal?: string[];
  low?: string[];
  medium?: string[];
  high?: string[];
  dangerous?: string[];
}

export interface PermissionPrefixMapping {
  from: string;
  to: string;
}

export interface Classification {
  level: PermissionLevel;
  dangerous: boolean;
}
