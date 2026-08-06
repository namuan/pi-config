---
description: Cheap, fast coding executor for well-specified, low-judgment work. DELEGATE to it for mechanical refactors, multi-file find-and-replace, removing deprecated integrations, formatting/lint fixes, and running slow test/e2e/build suites. DO NOT delegate to it for hard features with subtle intent, cross-cutting design, architecture decisions, interpreting ambiguous requirements, or anything where the judgment is the deliverable. Hand it a precise spec; it returns a concise result plus verification, and escalates back when judgment is required.
argument-hint: "[task]"
---

Delegate to the sidekick subagent.

Call the subagent tool exactly once with:
- agent: "sidekick"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
