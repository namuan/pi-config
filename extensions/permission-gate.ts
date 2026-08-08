/**
 * Permission Gate Extension — ported from ~/.config/opencode/opencode.json
 *
 * Enforces the bash / read / write / edit rules the user had in opencode:
 *   - deny: forced pushes, .env / credentials reads & deletions, secret-file
 *     reads, edits to ~/.ssh and ~/.docker
 *   - ask:  git reset --hard, git clean, rm -rf, and non-readonly Git commands
 *     other than commits (commits use permission-layers safety scoring)
 *   - allow: read-only git commands (status, diff, log, show, ...)
 *
 * In non-interactive mode (subagent processes, -p), "ask" becomes "block".
 */

import * as path from "node:path";
import * as os from "node:os";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ─── glob → regex ────────────────────────────────────────────────────────────

function globToRegex(pattern: string): RegExp {
	const home = os.homedir();
	let p = pattern;
	if (p.startsWith("~/")) p = home + p.slice(1);
	if (p.startsWith("~")) p = home + p.slice(1);

	const escaped = p
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*\*/g, "\u0000")
		.replace(/\*/g, "[^/]*")
		.replace(/\u0000/g, ".*");
	return new RegExp(`^${escaped}$`);
}

// ─── rules ───────────────────────────────────────────────────────────────────

const READ_DENY: RegExp[] = [
	globToRegex("~/.ssh/**"),
	globToRegex("~/.docker/**"),
	globToRegex(".env*"),
	globToRegex("**/.env*"),
	globToRegex("*.pem"),
	globToRegex("*.key"),
	globToRegex("*.p12"),
	globToRegex("*.jks"),
	globToRegex("*credentials*"),
];

const WRITE_DENY: RegExp[] = [globToRegex("~/.ssh/**"), globToRegex("~/.docker/**"), globToRegex(".env*"), globToRegex("**/.env*")];

// Git subcommands allowed through this hard gate. Commits are evaluated by the
// permission-layers scorer; other entries are read-only (or non-destructive staging).
function isGitGateAllowed(sub: string): boolean {
	const [cmd, ...rest] = sub.trim().split(/\s+/);
	if (cmd === "stash") return rest[0] === "list" || rest[0] === "show";
	return /^(commit|notes|status|diff|log|show|blame|grep|reflog|describe|ls-files|rev-parse|rev-list|cat-file|ls-tree|shortlog|whatchanged|for-each-ref|name-rev|cherry|merge-base|check-attr|check-ignore|fsck|help|version|add)$/.test(
		cmd ?? "",
	);
}

// Bash patterns: [regex, "deny" | "ask"]  (order matters — first match wins)
const BASH_RULES: Array<[RegExp, "deny" | "ask"]> = [
	// force pushes — always deny
	[/git\s+push\b[^|&;]*?(--force|-f\b)/i, "deny"],
	// any push — deny (executors must never push)
	[/(^|\s)(env\s+)?(git|git\.exe)(\s+-[a-zA-Z][a-zA-Z0-9-]*)*(\s+[a-z][a-z0-9-]*)*\s+push\b/i, "deny"],
	// git reset --hard / clean — ask
	[/git\s+(reset\s+--hard|clean)/i, "ask"],
	// recursive file removal (rm -r, rm -rf, rm -fr, ...) — ask
	[/\brm\s+-[a-zA-Z]*r[a-zA-Z]*\b/i, "ask"],
	[/\b(Remove-Item|del|rd)\b.*(-Recurse|-Force|\/s)/i, "ask"],
	// .env / credentials reads and removals — deny
	[/(^|\s)(cat|type|gc|Get-Content|Select-String|findstr)\s+[^|&;]*\.env/i, "deny"],
	[/\brm\s+[^|&;]*(credentials|\.env)/i, "deny"],
];

function bashDecision(command: string): "allow" | "ask" | "deny" {
	const trimmed = command.trim();
	for (const [re, action] of BASH_RULES) {
		if (re.test(trimmed)) return action;
	}
	const gitMatch = trimmed.match(/^(env\s+)?(git|git\.exe)\s+(.+)$/i);
	if (gitMatch) {
		return isGitGateAllowed(gitMatch[3]) ? "allow" : "ask";
	}
	return "allow";
}

function pathDecision(filePath: string, denyRules: RegExp[], cwd: string): "allow" | "deny" {
	if (!filePath) return "allow";
	const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
	for (const re of denyRules) {
		if (re.test(resolved)) return "deny";
	}
	return "allow";
}

// ─── extension ───────────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		const input = event.input as Record<string, unknown>;
		const cwd = ctx.cwd;

		// ── read / write / edit: secret-path protection ──
		if (event.toolName === "read") {
			const p = (input.file_path ?? input.path ?? "") as string;
			if (pathDecision(p, READ_DENY, cwd) === "deny") {
				return { block: true, reason: "Blocked: path matches secret-file deny rules (.env, .pem, .key, .ssh, credentials)" };
			}
			return undefined;
		}

		if (event.toolName === "write" || event.toolName === "edit") {
			const p = (input.file_path ?? input.path ?? "") as string;
			if (pathDecision(p, WRITE_DENY, cwd) === "deny") {
				return { block: true, reason: "Blocked: path matches edit deny rules (~/.ssh, ~/.docker, .env)" };
			}
			return undefined;
		}

		// ── bash: command rules ──
		if (event.toolName === "bash") {
			const command = (input.command ?? "") as string;
			const decision = bashDecision(command);

			if (decision === "deny") {
				return { block: true, reason: "Blocked: command matches deny rule (git push, .env reads, credential removal)" };
			}

			if (decision === "ask") {
				if (!ctx.hasUI) {
					return { block: true, reason: "Blocked: command requires confirmation but no UI is available" };
				}
				const choice = await ctx.ui.confirm("Allow command?", `$ ${command}\n\nThis command requires approval per your permission rules.`);
				if (!choice) return { block: true, reason: "Blocked by user" };
			}
		}

		return undefined;
	});
}
