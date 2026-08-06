---
description: Builds system structure and module relationships
argument-hint: "[task]"
---

Delegate to the docs-mapper subagent.

Call the subagent tool exactly once with:
- agent: "docs-mapper"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
