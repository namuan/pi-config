---
description: Extracts user-facing features from the codebase
argument-hint: "[task]"
---

Delegate to the docs-feature subagent.

Call the subagent tool exactly once with:
- agent: "docs-feature"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
