/** Internal command-risk bands used only to distinguish read-only commands. */
export type PermissionLevel = "minimal" | "low" | "medium" | "high";

export const LEVEL_INDEX: Record<PermissionLevel, number> = {
  minimal: 0,
  low: 1,
  medium: 2,
  high: 3,
};
