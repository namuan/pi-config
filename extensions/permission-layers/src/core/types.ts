export type PermissionLevel =
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "bypassed";

export type PermissionMode = "ask" | "block";

export const LEVELS: PermissionLevel[] = [
  "minimal",
  "low",
  "medium",
  "high",
  "bypassed",
];
export const PERMISSION_MODES: PermissionMode[] = ["ask", "block"];

export const LEVEL_INDEX: Record<PermissionLevel, number> = {
  minimal: 0,
  low: 1,
  medium: 2,
  high: 3,
  bypassed: 4,
};

export const LEVEL_INFO: Record<
  PermissionLevel,
  { label: string; desc: string; enables: string }
> = {
  minimal: {
    label: "Minimal",
    desc: "Read-only",
    enables: "read-only commands such as ls, cat, grep, and git status/diff",
  },
  low: {
    label: "Low",
    desc: "File ops only",
    enables: "file writes through write/edit tools and shell output redirection",
  },
  medium: {
    label: "Medium",
    desc: "Dev operations",
    enables:
      "development work such as package installs, builds, tests, file creation, and local Git operations",
  },
  high: {
    label: "High",
    desc: "Full operations",
    enables:
      "remote and unrestricted commands such as git push, curl/wget, SSH, deployments, and unknown scripts",
  },
  bypassed: {
    label: "Bypassed",
    desc: "All checks disabled",
    enables: "all commands without permission checks (dangerous; intended for isolated automation)",
  },
};

export const PERMISSION_MODE_INFO: Record<
  PermissionMode,
  { label: string; desc: string }
> = {
  ask: { label: "Ask", desc: "Prompt when permission is required" },
  block: { label: "Block", desc: "Block instead of prompting" },
};

export type Notification = "off" | "on" | "unfocused" | "persistent";
