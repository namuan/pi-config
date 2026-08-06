#!/usr/bin/env python3
"""Regenerate the pi config from the opencode config in ~/.config/opencode.

Outputs:
  ~/.pi/agent/agents/<name>.md   — subagent definitions (name, description,
                                   optional model/tools, body = agent prompt)
  ~/.pi/agent/prompts/<name>.md  — slash-command templates. For every agent a
                                   thin *delegation launcher* that tells the
                                   main model to call the `subagent` tool.
                                   Prompt files with no matching agent
                                   (compaction, default, default-plan) are
                                   copied verbatim.
"""
import re
from pathlib import Path

SRC_AGENTS = Path.home() / ".config/opencode/agents"
SRC_PROMPTS = Path.home() / ".config/opencode/agent-prompts"
AGENTS_DEST = Path.home() / ".pi/agent/agents"
PROMPTS_DEST = Path.home() / ".pi/agent/prompts"

# model: only map IDs that exist in pi's model store; omit otherwise
MODEL_MAP = {
    "openai/gpt-5.6-terra": "openai/gpt-5.6-terra",
    "openai/gpt-5.6-sol": "openai/gpt-5.6-sol",
    "opencode-go/deepseek-v4-flash": "opencode-go/deepseek-v4-flash",
    "opencode-go/deepseek-v4-pro": "opencode-go/deepseek-v4-pro",
    "opencode-go/mimo-v2.5-pro": "opencode-go/mimo-v2.5-pro",
}

# Only regenerate these agents; everything else is intentionally dropped.
# Update this if you want to keep more of the opencode lineup.
def KEEP(name: str) -> bool:
    return name.startswith("axiom-") or name.startswith("tdd-")

# Read-only agents: no write/edit tools
READ_ONLY = {"reviewer", "research", "explore", "vision", "planner", "tdd-reviewer",
             "docs-architecture", "docs-feature", "docs-judge", "docs-mapper",
             "docs-scout", "docs-trace"}

# Fallback descriptions for prompt files without opencode frontmatter
FALLBACK_DESC = {
    "explore": "Code exploration sub-agent: glob/regex search, returns findings to master",
    "general": "Sub-agent executor: executes tasks from the master agent without replanning",
    "compaction": "Summarizes conversation history for coding sessions (anchored summary)",
    "default": "Main agent prompt (build): English, maximum reasoning effort",
    "default-plan": "Delete task to Planner Agent",
}

LAUNCHER = """Delegate to the {name} subagent.

Call the subagent tool exactly once with:
- agent: "{name}"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error."""


def parse_frontmatter(text: str):
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?", text, re.S)
    if not m:
        return {}, text
    fm = {}
    for line in m.group(1).splitlines():
        mm = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if mm and not line.startswith(" "):
            fm[mm.group(1)] = re.sub(r'^"(.*)"$', r"\1", mm.group(2).strip())
    return fm, text[m.end():]


def yaml_quote(value: str) -> str:
    """Quote a YAML plain scalar when it would confuse the parser (colons, quotes)."""
    if re.search(r'["\\]', value) or ": " in value:
        return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return value


def agent_definition(name: str, desc: str, model: str | None, tools: str | None, body: str) -> str:
    out = ["---", f"name: {name}", f"description: {yaml_quote(desc)}"]
    if model:
        out.append(f"model: {model}")
    if tools:
        out.append(f"tools: {tools}")
    out.append("---")
    out.append("")
    out.append(body.rstrip())
    return "\n".join(out) + "\n"


def prompt_template(desc: str, body: str, argument_hint: str | None = None) -> str:
    out = ["---", f"description: {yaml_quote(desc)}"]
    if argument_hint:
        out.append(f'argument-hint: "{argument_hint}"')
    out.append("---")
    out.append("")
    out.append(body.rstrip())
    return "\n".join(out) + "\n"


def main():
    AGENTS_DEST.mkdir(parents=True, exist_ok=True)
    PROMPTS_DEST.mkdir(parents=True, exist_ok=True)

    # 1. agent definitions from agents/*.md (+ explore/general from agent-prompts)
    agent_bodies: dict[str, str] = {}
    for src in sorted(SRC_AGENTS.glob("*.md")):
        if not KEEP(src.stem):
            continue
        fm, body = parse_frontmatter(src.read_text())
        agent_bodies[src.stem] = body
    for name in ("explore", "general"):
        if not KEEP(name):
            continue
        src = SRC_PROMPTS / f"{name}.md"
        if src.exists():
            _, body = parse_frontmatter(src.read_text())
            agent_bodies[name] = body

    written = 0
    for name, body in sorted(agent_bodies.items()):
        fm, _ = parse_frontmatter((SRC_AGENTS / f"{name}.md").read_text()) if (SRC_AGENTS / f"{name}.md").exists() else ({}, "")
        desc = fm.get("description", "").strip() or FALLBACK_DESC.get(name, name)
        model = MODEL_MAP.get(fm.get("model", ""))
        tools = "read, grep, find, ls, bash" if name in READ_ONLY else None
        (AGENTS_DEST / f"{name}.md").write_text(agent_definition(name, desc, model, tools, body))
        written += 1

    # 2. prompts: delegation launchers for agents, verbatim for the rest
    prompt_files = [p for p in list(SRC_AGENTS.glob("*.md")) + list(SRC_PROMPTS.glob("*.md")) if KEEP(p.stem)]
    for src in prompt_files:
        name = src.stem
        fm, body = parse_frontmatter(src.read_text())
        desc = fm.get("description", "").strip() or FALLBACK_DESC.get(name, "")
        if name in agent_bodies:
            content = prompt_template(desc, LAUNCHER.format(name=name), argument_hint="[task]")
        else:
            content = prompt_template(desc or next((l.strip() for l in body.splitlines() if l.strip()), ""), body)
        (PROMPTS_DEST / f"{name}.md").write_text(content)
        written += 1

    print(f"Wrote {written} files: {len(agent_bodies)} agents, {len(prompt_files)} prompts -> {AGENTS_DEST}, {PROMPTS_DEST}")

    # prune files that are no longer generated (keep dest dirs mirroring the source)
    kept_agents = set(agent_bodies)
    kept_prompts = {p.stem for p in prompt_files}
    for f in AGENTS_DEST.glob("*.md"):
        if f.stem not in kept_agents:
            f.unlink()
    for f in PROMPTS_DEST.glob("*.md"):
        if f.stem not in kept_prompts:
            f.unlink()


if __name__ == "__main__":
    main()
