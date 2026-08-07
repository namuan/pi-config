/**
 * Session command approvals for Pi.
 *
 * Read-only shell commands run normally. Every other shell command requires a
 * narrow, explicit session approval; the existing permission-gate extension
 * remains responsible for protected paths and organization-specific policies.
 */

import type {
  ExtensionAPI,
  ExtensionContext,
  ToolCallEvent,
} from "@earendil-works/pi-coding-agent";
import {
  classifyCommand,
  getCommandPermissionBreakdown,
  getSessionApprovalScopeLabel,
  getSessionApprovalScopes,
  type SessionApprovalScope,
} from "./src/core/classifiers/shell-classifier";

const scopesMatch = (
  left: SessionApprovalScope,
  right: SessionApprovalScope,
): boolean =>
  left.kind === right.kind &&
  left.tokens.length === right.tokens.length &&
  left.tokens.every((token, index) => token === right.tokens[index]);

const formatCommandBreakdown = (command: string): string => {
  const breakdown = getCommandPermissionBreakdown(command);
  const lines = breakdown.map((item) => {
    const status = item.level === "minimal" ? "read-only" : "needs approval";
    const dangerous = item.dangerous ? "; dangerous" : "";
    return `  ${status}: ${item.command}${dangerous}`;
  });

  // Redirections are intentionally excluded from command tokens by the shell
  // parser. If they were the only elevated operation, make that explicit.
  if (
    classifyCommand(command).level !== "minimal" &&
    breakdown.every((item) => item.level === "minimal")
  ) {
    lines.push("  needs approval: shell redirection or other shell syntax");
  }

  return ["Command breakdown:", ...lines].join("\n");
};

export default function (pi: ExtensionAPI) {
  const sessionApprovals: SessionApprovalScope[] = [];

  pi.on("session_start", () => {
    sessionApprovals.length = 0;
  });

  pi.on("tool_call", async (event: ToolCallEvent, ctx: ExtensionContext) => {
    if (event.toolName !== "bash") return undefined;

    const command = String((event.input as { command?: unknown }).command ?? "");
    const classification = classifyCommand(command);
    const breakdown = formatCommandBreakdown(command);

    // Keep the read-only baseline frictionless. There is no mutable permission
    // level: every action above this baseline requires its own session approval.
    if (classification.level === "minimal") return undefined;

    // Dangerous commands are deliberately never covered by a reusable scope.
    if (classification.dangerous) {
      if (!ctx.hasUI) {
        return {
          block: true,
          reason: `Dangerous command requires interactive confirmation: ${command}`,
        };
      }

      const choice = await ctx.ui.select(
        `⚠️ Dangerous command:\n\n$ ${command}\n\n${breakdown}`,
        ["Allow once", "Cancel"],
      );
      if (choice === "Allow once") return undefined;
      return {
        block: true,
        reason: "Cancelled by the user. Do not attempt to repeat or circumvent.",
      };
    }

    const scopes = getSessionApprovalScopes(command);
    const isApproved = scopes.some((candidate) =>
      sessionApprovals.some((allowed) => scopesMatch(allowed, candidate)),
    );
    if (isApproved) return undefined;

    if (!ctx.hasUI) {
      return {
        block: true,
        reason: `Session approval required for: $ ${command}\n${breakdown}\nRun interactively to approve this command.`,
      };
    }

    const scopeOptions = scopes.map((scope) => ({
      scope,
      label: getSessionApprovalScopeLabel(scope),
    }));
    const scopeSummary = scopeOptions.length > 0
      ? "Choose an exact command, command/subcommand prefix, or executable prefix. Approvals last only for this session."
      : "This command uses compound shell syntax, so it can only be approved once.";
    const choice = await ctx.ui.select(
      `Session approval required:\n\n$ ${command}\n\n${breakdown}\n\n${scopeSummary}`,
      ["Allow once", ...scopeOptions.map((option) => option.label), "Cancel"],
    );

    if (choice === "Allow once") return undefined;

    const selected = scopeOptions.find((option) => option.label === choice);
    if (selected) {
      sessionApprovals.push(selected.scope);
      ctx.ui.notify(`Session approval: ${selected.label}`, "info");
      return undefined;
    }

    return {
      block: true,
      reason: "Cancelled by the user. Do not attempt to repeat or circumvent.",
    };
  });
}
