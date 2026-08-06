---
description: Refactor-phase subagent in the TDD cycle. Improves the code written in the green phase without changing behavior. Removes duplication, clarifies names, simplifies logic, extracts helpers -- while keeping all tests green. DELEGATE to it from the tdd-lead agent.
argument-hint: "[task]"
---

Delegate to the tdd-refactor subagent.

Call the subagent tool exactly once with:
- agent: "tdd-refactor"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
