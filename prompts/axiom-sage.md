---
description: Axiom Sage — second-stage expert and verifier. Receives the original request plus an assessment, draft, or escalation package from the axiom-scout first-stage agent; produces the most accurate, complete, and reliable final answer; independently verifies the first-stage output and corrects or completes it. Use when axiom-scout escalates, or for any consequential, ambiguous, or complex work needing a stronger model.
argument-hint: "[task]"
---

Delegate to the axiom-sage subagent.

Call the subagent tool exactly once with:
- agent: "axiom-sage"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
