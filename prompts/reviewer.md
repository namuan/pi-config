---
description: Review agent with two jobs. DELEGATE to it to critique a plan before implementation (gaps, risky assumptions, missed edge cases, simpler alternatives) or to audit a diff before commit (correctness, scope creep, security, and whether the change matches the plan). It can read the codebase and run git diff plus lint/test, but it never edits files. Hand it the plan or the diff plus what to check; it reports issues back to the main agent, which owns the decisions and any re-delegation of fixes.
argument-hint: "[task]"
---

Delegate to the reviewer subagent.

Call the subagent tool exactly once with:
- agent: "reviewer"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
