---
description: Plan-mode orchestrator for the Fusion team. Same planning brain as the main agent, but it does not execute - it investigates read-only (reading files directly or delegating larger searches to subagents) and produces a reviewed plan, then hands off to orchestrator to carry it out. Cannot edit files or run state-changing commands.
argument-hint: "[task]"
---

Delegate to the planner subagent.

Call the subagent tool exactly once with:
- agent: "planner"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
