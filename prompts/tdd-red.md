---
description: Red-phase subagent in the TDD cycle. Writes a failing test as specified by the lead, confirms it fails with the expected message, and reports back. Never writes implementation code -- only tests. DELEGATE to it from the tdd-lead agent.
argument-hint: "[task]"
---

Delegate to the tdd-red subagent.

Call the subagent tool exactly once with:
- agent: "tdd-red"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
