---
description: Axiom Scout — first-stage task router and worker. Classifies tasks by type, risk, and ambiguity; completes cheap, low-risk, verifiable work itself; requests clarification when needed; and escalates complex, high-risk, ambiguous, or unverifiable work to the axiom-sage subagent. Use for first-pass handling before spending a stronger model.
argument-hint: "[task]"
---

Delegate to the axiom-scout subagent.

Call the subagent tool exactly once with:
- agent: "axiom-scout"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
