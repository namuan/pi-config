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
import {
  loadGlobalCommandApprovals,
  saveGlobalCommandApprovals,
} from "./src/core/settings";

const scopesMatch = (
  left: SessionApprovalScope,
  right: SessionApprovalScope,
): boolean =>
  left.kind === right.kind &&
  left.tokens.length === right.tokens.length &&
  left.tokens.every((token, index) => token === right.tokens[index]);

type BreakdownTheme = {
  fg: (color: "success" | "warning" | "error", text: string) => string;
};

const themed = (
  theme: BreakdownTheme | undefined,
  color: "success" | "warning" | "error",
  text: string,
): string => theme?.fg(color, text) ?? text;

type CommandApprovalTarget = {
  command: string;
  scopes: SessionApprovalScope[];
};

const getCommandApprovalTargets = (
  command: string,
): CommandApprovalTarget[] =>
  getCommandPermissionBreakdown(command)
    .filter((item) => item.level !== "minimal" && !item.dangerous)
    .map((item) => ({
      command: item.command,
      scopes: getSessionApprovalScopes(item.command),
    }));

const scopeIsApproved = (
  scope: SessionApprovalScope,
  approvals: SessionApprovalScope[],
): boolean => approvals.some((approval) => scopesMatch(approval, scope));

const commandIsApproved = (
  command: string,
  approvals: SessionApprovalScope[],
): boolean => {
  const targets = getCommandApprovalTargets(command);
  return (
    targets.length > 0 &&
    targets.every((target) =>
      target.scopes.some((scope) => scopeIsApproved(scope, approvals)),
    )
  );
};

const getUnapprovedScopes = (
  command: string,
  approvals: SessionApprovalScope[],
): SessionApprovalScope[] => {
  const scopes = getCommandApprovalTargets(command)
    .filter((target) => !target.scopes.some((scope) => scopeIsApproved(scope, approvals)))
    .flatMap((target) => target.scopes);

  return scopes.filter(
    (scope, index) =>
      scopes.findIndex((candidate) => scopesMatch(candidate, scope)) === index,
  );
};

const getGlobalScopeLabel = (scope: SessionApprovalScope): string =>
  getSessionApprovalScopeLabel(scope)
    .replace(/^Allow /, "Always allow ")
    .replace("(session)", "(all sessions)");

const cancellationReason = (command: string): string =>
  getCommandPermissionBreakdown(command).length > 1
    ? "Cancelled by the user. Do not retry or circumvent. Do not send compound shell commands; use one bash command per tool call so each action can be reviewed separately."
    : "Cancelled by the user. Do not attempt to repeat or circumvent.";

const formatCommandBreakdown = (
  command: string,
  theme?: BreakdownTheme,
): string => {
  const breakdown = getCommandPermissionBreakdown(command);
  const lines = breakdown.map((item) => {
    const isReadOnly = item.level === "minimal";
    const color = item.dangerous ? "error" : isReadOnly ? "success" : "warning";
    const marker = item.dangerous ? "✕" : isReadOnly ? "✓" : "!";
    return themed(theme, color, `${marker} ${item.command}`);
  });

  // Redirections are intentionally excluded from command tokens by the shell
  // parser. If they were the only elevated operation, make that explicit.
  if (
    classifyCommand(command).level !== "minimal" &&
    breakdown.every((item) => item.level === "minimal")
  ) {
    lines.push(
      themed(theme, "warning", "! shell redirection or other shell syntax"),
    );
  }

  const legend = "✓ no approval · ! approval · ✕ danger";
  return breakdown.length > 1 ? [legend, ...lines].join("\n") : lines.join("\n");
};

export default function (pi: ExtensionAPI) {
  const sessionApprovals: SessionApprovalScope[] = [];
  let globalApprovals: SessionApprovalScope[] = [];

  pi.on("session_start", () => {
    sessionApprovals.length = 0;
    globalApprovals = loadGlobalCommandApprovals().map((approval) => ({
      kind: approval.kind,
      tokens: [...approval.tokens],
    }));
  });

  pi.on("tool_call", async (event: ToolCallEvent, ctx: ExtensionContext) => {
    if (event.toolName !== "bash") return undefined;

    const command = String((event.input as { command?: unknown }).command ?? "");
    const classification = classifyCommand(command);
    const breakdown = formatCommandBreakdown(
      command,
      ctx.hasUI ? (ctx.ui.theme as BreakdownTheme | undefined) : undefined,
    );

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
        reason: cancellationReason(command),
      };
    }

    if (commandIsApproved(command, [...sessionApprovals, ...globalApprovals])) {
      return undefined;
    }

    if (!ctx.hasUI) {
      return {
        block: true,
        reason: `Session approval required for: $ ${command}\n${breakdown}\nRun interactively to approve this command.`,
      };
    }

    while (true) {
      const approvals = [...sessionApprovals, ...globalApprovals];
      const scopes = getUnapprovedScopes(command, approvals);
      const scopeOptions = scopes.map((scope) => ({
        scope,
        label: getSessionApprovalScopeLabel(scope),
      }));
      const globalApprovalLabel = "Choose a global command approval…";
      const scopeSummary = scopeOptions.length > 0
        ? "Scope: exact · command/subcommand · executable · global"
        : "Only once: complex shell syntax.";
      const choice = await ctx.ui.select(
        `Approval needed\n$ ${command}\n${breakdown}\n${scopeSummary}`, 
        [
          "Allow once",
          ...scopeOptions.map((option) => option.label),
          ...(scopeOptions.length > 0 ? [globalApprovalLabel] : []),
          "Cancel",
        ],
      );

      if (choice === "Allow once") return undefined;

      const selected = scopeOptions.find((option) => option.label === choice);
      if (selected) {
        sessionApprovals.push(selected.scope);
        ctx.ui.notify(`Session approval: ${selected.label}`, "info");
        if (commandIsApproved(command, [...sessionApprovals, ...globalApprovals])) {
          return undefined;
        }
        continue;
      }

      if (choice === globalApprovalLabel) {
        const globalOptions = scopeOptions.map((option) => ({
          scope: option.scope,
          label: getGlobalScopeLabel(option.scope),
        }));
        const globalChoice = await ctx.ui.select(
          "Choose a global command approval:",
          [...globalOptions.map((option) => option.label), "Cancel"],
        );
        const globalSelection = globalOptions.find(
          (option) => option.label === globalChoice,
        );
        if (!globalSelection) continue;

        try {
          const nextGlobalApprovals = [...globalApprovals, globalSelection.scope];
          saveGlobalCommandApprovals(nextGlobalApprovals);
          globalApprovals = nextGlobalApprovals;
          ctx.ui.notify(`Global approval: ${globalSelection.label}`, "info");
          if (commandIsApproved(command, [...sessionApprovals, ...globalApprovals])) {
            return undefined;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          ctx.ui.notify(`Could not save global approval: ${message}`, "error");
        }
        continue;
      }

      return {
        block: true,
        reason: cancellationReason(command),
      };
    }
  });
}
