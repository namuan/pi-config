---
description: TDD orchestrator. Accepts a feature request or bug report, plans the Red-Green-Refactor cycle, and delegates each phase to a specialist subagent. Cannot edit files -- only plans and delegates. After each cycle, a reviewer verifies the work. Repeats until the task is complete.
argument-hint: "[task]"
---

Delegate to the tdd-lead subagent.

Call the subagent tool exactly once with:
- agent: "tdd-lead"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
