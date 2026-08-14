# pi agent config

Personal [pi](https://github.com/earendil-works/pi-coding-agent) configuration:
custom agents migrated from [opencode](https://opencode.ai), prompt templates,
and a permission gate.

## Contents

- `agents/` — subagent definitions for the `subagent` tool: the axiom sage
  verifier and the TDD red-green-refactor cycle (lead, red, green, refactor,
  reviewer)
- `prompts/` — slash-command templates, type `/` in pi to use them. The
  `/axiom-scout <task>` template runs the Scout orchestration workflow in the
  primary session and delegates planning and verification to the `axiom-sage`
  subagent. The TDD templates remain thin delegation launchers for their
  matching agents.
- `extensions/` — `permission-gate.ts` (blocks git push/commit, `.env` reads,
  secret-file access) and `subagent/` (isolated pi subprocess delegation)
- `patches/` — local fixes for pi's bundled packages; re-apply after pi updates
  (see [Applying patches](#applying-patches))

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

## Applying patches

`patches/` holds local fixes to pi's bundled packages. Apply them all (or
check/revert) with the script — it resolves the pi install root from the `pi`
binary on PATH and skips patches that are already applied:

```sh
~/.pi/agent/patches/apply.sh            # apply all (idempotent)
~/.pi/agent/patches/apply.sh status     # applied state of each patch
~/.pi/agent/patches/apply.sh revert     # undo all (reverse order)
```

Run `apply.sh` again after every `pi update` that touches a patched package.

## Notes

- `auth.json`, `sessions/`, `models-store.json`, `trust.json`, `settings.json`,
  and `models.json` are gitignored — they are machine-specific or contain
  credentials and are never published.
- Agent frontmatter supports `name`, `description`, `model`, and `tools`
  (see `pi/README.md` in the source opencode repo for details).
