---
description: "Code exploration sub-agent: glob/regex search, returns findings to master"
argument-hint: "[task]"
---

Delegate to the explore subagent.

Call the subagent tool exactly once with:
- agent: "explore"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
