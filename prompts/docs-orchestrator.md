---
description: Coordinates multi-agent codebase analysis workflow
argument-hint: "[task]"
---

Delegate to the docs-orchestrator subagent.

Call the subagent tool exactly once with:
- agent: "docs-orchestrator"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
