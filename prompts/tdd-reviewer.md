---
description: "TDD cycle reviewer. Audits a completed Red-Green-Refactor cycle: checks test quality, implementation minimality, refactor cleanness, and whether the overall task is now complete. Read-only -- never edits files. DELEGATE to it from the tdd-lead agent after each cycle."
argument-hint: "[task]"
---

Delegate to the tdd-reviewer subagent.

Call the subagent tool exactly once with:
- agent: "tdd-reviewer"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
