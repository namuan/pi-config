# pi agent config

Personal [pi](https://github.com/earendil-works/pi-coding-agent) configuration:
custom agents migrated from [opencode](https://opencode.ai), prompt templates,
and a permission gate.

## Contents

- `agents/` — subagent definitions for the `subagent` tool (orchestrator,
  planner, reviewer, sidekick, design, research, TDD red-green-refactor cycle,
  docs analysis, axiom scout/sage router, explore, general)
- `prompts/` — slash-command templates, type `/` in pi to use them. Each one
  is a thin *delegation launcher* that tells the main model to call the
  `subagent` tool for the matching agent: `/reviewer <task>` runs the review
  in an isolated subagent and returns findings. (`compaction`, `default`,
  `default-plan` are kept verbatim — they have no matching agent.)
- `extensions/` — `permission-gate.ts` (blocks git push/commit, `.env` reads,
  secret-file access) and `subagent/` (isolated pi subprocess delegation)
- `tools/migrate-opencode-agents.py` — regenerates `agents/` and `prompts/`
  from the opencode config in `~/.config/opencode`

## Install

```sh
git clone https://github.com/namuan/pi-config ~/.pi/agent-tmp
# or: symlink/copy agents/, prompts/, extensions/ into ~/.pi/agent
```

If you already have `~/.pi/agent`, link the three directories:

```sh
ln -s <repo>/agents ~/.pi/agent/agents
ln -s <repo>/prompts ~/.pi/agent/prompts
ln -s <repo>/extensions ~/.pi/agent/extensions
```

Then restart pi. Type `/` for the prompt templates; ask the model to use the
`subagent` tool to delegate to an agent.

## Notes

- `auth.json`, `sessions/`, `models-store.json`, `trust.json`, `settings.json`,
  and `models.json` are gitignored — they are machine-specific or contain
  credentials and are never published.
- Agent frontmatter supports `name`, `description`, `model`, and `tools`
  (see `pi/README.md` in the source opencode repo for details).
