---
description: Frontend/UI implementation agent. DELEGATE to it to build or restyle interfaces - components, layouts, CSS/Tailwind, design-system work. It loads the environment's design skills before writing, can run a dev server or build, and edits files directly. Give it the design intent and constraints; big product/UX decisions stay with the main agent. It can delegate mechanical work to the sidekick.
argument-hint: "[task]"
---

Delegate to the design subagent.

Call the subagent tool exactly once with:
- agent: "design"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
