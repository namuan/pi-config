/**
 * Axiom reflection watchdog
 *
 * During an /axiom-scout run, turn repeated tool failures or a long-running
 * failed investigation into a mandatory Sage consultation before more changes
 * or shell commands can be made.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type Failure = {
	toolName: string;
	summary: string;
};

const EXECUTION_TOOLS = new Set(["bash", "edit", "write"]);
const REPEATED_ATTEMPT_LIMIT = 3;
const FAILURE_LIMIT = 2;
const LONG_RUNNING_TURN_LIMIT = 12;

function isScoutPrompt(text: string): boolean {
	return text.startsWith("/axiom-scout") || text.includes("You are the user-facing Axiom orchestrator");
}

function isSageCall(input: unknown): boolean {
	if (!input || typeof input !== "object") return false;
	const task = input as { agent?: unknown; tasks?: unknown; chain?: unknown };
	if (task.agent === "axiom-sage") return true;
	if (Array.isArray(task.tasks)) return task.tasks.some((item) => item?.agent === "axiom-sage");
	if (Array.isArray(task.chain)) return task.chain.some((item) => item?.agent === "axiom-sage");
	return false;
}

function summarizeOutput(content: unknown): string {
	if (!Array.isArray(content)) return "No tool output was available.";
	const text = content
		.map((part) => {
			if (!part || typeof part !== "object" || !("text" in part)) return "";
			return typeof part.text === "string" ? part.text : "";
		})
		.join("\n")
		.replace(/\s+/g, " ")
		.trim();
	return text.slice(0, 500) || "No error text was available.";
}

function attemptKey(toolName: string, input: unknown): string {
	try {
		return `${toolName}:${JSON.stringify(input)}`.slice(0, 1000);
	} catch {
		return toolName;
	}
}

export default function (pi: ExtensionAPI) {
	let scoutActive = false;
	let reflectionRequired = false;
	let reflectionReason = "";
	let failures: Failure[] = [];
	const attempts = new Map<string, number>();

	const reset = () => {
		scoutActive = false;
		reflectionRequired = false;
		reflectionReason = "";
		failures = [];
		attempts.clear();
	};

	const requireReflection = async (reason: string, ctx: ExtensionContext) => {
		if (!scoutActive || reflectionRequired) return;

		reflectionRequired = true;
		reflectionReason = reason;
		const evidence = failures.length
			? failures.map((failure, index) => `${index + 1}. ${failure.toolName}: ${failure.summary}`).join("\n")
			: "The same execution attempt has been repeated without a successful recovery.";

		pi.sendMessage(
			{
				customType: "axiom-reflection",
				content: [
					"AXIOM REFLECTION CHECKPOINT",
					`Trigger: ${reason}`,
					"Stop repeating the current approach. Before any further edit, write, or bash command, call axiom-sage with an explicit Caller: axiom-scout header.",
					"Give Sage the original request, current goal, attempts and errors below, relevant files/diff, and ask for root-cause analysis, a bounded recovery plan, and verification steps.",
					"After Sage responds, follow one bounded recovery plan. If that plan fails, report the limitation or consult Sage again; do not keep retrying blindly.",
					`Evidence:\n${evidence}`,
				].join("\n\n"),
				display: true,
			},
			{ deliverAs: "steer", triggerTurn: true },
		);

		if (ctx.hasUI) ctx.ui.notify("Axiom reflection checkpoint: Sage consultation required", "warning");
	};

	pi.on("input", (event) => {
		if (event.source !== "extension" && event.text.startsWith("/axiom-scout")) {
			reset();
			scoutActive = true;
		}
	});

	pi.on("before_agent_start", (event) => {
		if (!scoutActive && isScoutPrompt(event.prompt)) {
			reset();
			scoutActive = true;
		}
	});

	pi.on("tool_call", async (event, ctx) => {
		if (!scoutActive) return undefined;

		if (reflectionRequired) {
			if (event.toolName === "subagent" && isSageCall(event.input)) return undefined;
			if (EXECUTION_TOOLS.has(event.toolName)) {
				return {
					block: true,
					reason: `Axiom reflection checkpoint is active (${reflectionReason}). Consult axiom-sage before more execution.`,
				};
			}
		}

		if (!EXECUTION_TOOLS.has(event.toolName)) return undefined;
		const key = attemptKey(event.toolName, event.input);
		const count = (attempts.get(key) ?? 0) + 1;
		attempts.set(key, count);
		if (count >= REPEATED_ATTEMPT_LIMIT) {
			await requireReflection(`Repeated the same ${event.toolName} attempt ${count} times.`, ctx);
			return {
				block: true,
				reason: "Repeated execution attempt detected. Consult axiom-sage before retrying it.",
			};
		}

		return undefined;
	});

	pi.on("tool_result", async (event, ctx) => {
		if (!scoutActive) return;

		if (event.toolName === "subagent" && isSageCall(event.input) && !event.isError && reflectionRequired) {
			reflectionRequired = false;
			failures = [];
			attempts.clear();
			if (ctx.hasUI) ctx.ui.notify("Axiom reflection complete: Sage guidance received", "info");
			return;
		}

		if (!event.isError || event.toolName === "subagent") return;
		failures.push({ toolName: event.toolName, summary: summarizeOutput(event.content) });
		failures = failures.slice(-4);
		if (failures.length >= FAILURE_LIMIT) {
			await requireReflection(`${failures.length} tools have failed in this task.`, ctx);
		}
	});

	pi.on("turn_end", async (event, ctx) => {
		if (scoutActive && !reflectionRequired && event.turnIndex >= LONG_RUNNING_TURN_LIMIT && failures.length > 0) {
			await requireReflection(`The task has run for ${event.turnIndex + 1} turns with unresolved tool failures.`, ctx);
		}
	});

	pi.on("agent_settled", () => {
		reset();
	});
}
