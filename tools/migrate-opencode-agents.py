#!/usr/bin/env python3
"""Migrate opencode agents (and agent-prompts) to Pi prompt templates.

opencode agent file -> ~/.pi/agent/prompts/<name>.md
  - `description` frontmatter maps 1:1 (Pi shows it in /autocomplete)
  - opencode-only keys (mode, model, temperature, color, permission) are
    preserved as x-opencode-* frontmatter keys. Pi ignores unknown keys,
    so they are harmless metadata; the template body is unchanged.
"""
import re
import shutil
from pathlib import Path

SRC_AGENTS = Path.home() / ".config/opencode/agents"
SRC_PROMPTS = Path.home() / ".config/opencode/agent-prompts"
DEST = Path.home() / ".pi/agent/prompts"

# Keys we translate or preserve
KNOWN = {"description", "argument-hint"}
PRESERVE = {"mode", "model", "temperature", "color"}


def parse_frontmatter(text: str):
    """Return (frontmatter_dict, body). Lenient YAML-subset parse:
    handles `key: value`, `key: "value"`, and `key:` scalars (no nested maps)."""
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?", text, re.S)
    if not m:
        return {}, text
    fm = {}
    for line in m.group(1).splitlines():
        mm = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if mm and not line.startswith(" "):
            key, val = mm.group(1), mm.group(2).strip()
            val = re.sub(r'^"(.*)"$', r"\1", val)
            fm[key] = val
    return fm, text[m.end():]


def convert(src: Path) -> str:
    """Return the Pi template content for an opencode agent/prompt file."""
    text = src.read_text()
    fm, body = parse_frontmatter(text)
    out = []
    out.append("---")
    desc = fm.get("description", "").strip()
    if desc:
        out.append(f"description: {desc}")
    for key in PRESERVE:
        if fm.get(key):
            out.append(f"x-opencode-{key}: {fm[key]}")
    if not desc and not any(fm.get(k) for k in PRESERVE):
        # agent-prompts files: no frontmatter at all; Pi falls back to first line
        first = next((l.strip() for l in body.splitlines() if l.strip()), "")
        out.append(f"description: {first[:60]}{'...' if len(first) > 60 else ''}")
    out.append("---")
    out.append("")
    out.append(body.rstrip())
    return "\n".join(out) + "\n"


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    converted = []
    for src in sorted(SRC_AGENTS.glob("*.md")):
        dst = DEST / src.name
        dst.write_text(convert(src))
        converted.append(dst)
    for src in sorted(SRC_PROMPTS.glob("*.md")):
        dst = DEST / src.name
        dst.write_text(convert(src))
        converted.append(dst)
    print(f"Wrote {len(converted)} templates to {DEST}")


if __name__ == "__main__":
    main()
