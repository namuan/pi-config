---
description: "Sub-agent executor: executes tasks from the master agent without replanning"
argument-hint: "[task]"
---

Delegate to the general subagent.

Call the subagent tool exactly once with:
- agent: "general"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
