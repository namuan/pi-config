---
description: Vision subagent for reading images and screenshots. DELEGATE to it when the main model cannot see images and you need a screenshot, mockup, diagram, or photo transcribed or described. It returns a literal text transcription plus a description; it does not edit files. Only needed when the main model lacks image input - if the main model reads images directly, you do not need this agent.
argument-hint: "[task]"
---

Delegate to the vision subagent.

Call the subagent tool exactly once with:
- agent: "vision"
- task: "$@"

If no task was provided, ask the user what they want to delegate before calling the tool.
Report the subagent's final output back to the user; if delegation fails, show the error.
