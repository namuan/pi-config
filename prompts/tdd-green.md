---
description: Green-phase subagent in the TDD cycle. Writes the minimal implementation code to make the failing test pass, confirms all tests pass, and reports back. Only writes the code needed to satisfy the test -- no extras, no scope creep. DELEGATE to it from the tdd-lead agent.
argument-hint: "[task]"
---

Delegate to the tdd-green subagent.

Call the subagent tool exactly once with:
- agent: "tdd-green"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
