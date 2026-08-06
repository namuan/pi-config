---
description: Plans, delegates, reviews, and verifies code changes through focused subagents
argument-hint: "[task]"
---

Delegate to the orchestrator subagent.

Call the subagent tool exactly once with:
- agent: "orchestrator"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
