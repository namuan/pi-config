---
description: Read-only research agent. DELEGATE to it to gather external information - web search, reading docs, comparing libraries/APIs, checking version-specific behavior - and to survey the codebase (read/grep/glob). It reports findings back; it never edits files. Hand it a specific question and tell it whether you want a quick lookup or a thorough survey. It can delegate follow-up lookups to the read-only explore agent.
argument-hint: "[task]"
---

Delegate to the research subagent.

Call the subagent tool exactly once with:
- agent: "research"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
