# Session command approvals

A vendored Pi extension that requires an explicit, session-only approval for non-read-only Bash commands.

## Behaviour

- Read-only commands such as `git status`, `ls`, `cat`, and `grep` run normally.
- Other simple commands offer these approval scopes:
  - the exact parsed command
  - its command/subcommand prefix, for example `npm run`
  - its executable prefix, for example `npm`
- Session scopes clear when the session ends. You can also choose a global scope, which persists in `~/.pi/agent/settings.json` and applies to future sessions.
- Compound commands show a per-command breakdown and offer reusable scopes for each elevated command. Every elevated segment must be approved before the compound command runs. Agents should use one bash command per tool call instead of bundling background jobs, loops, process termination, command substitutions, or long pipelines.
- Dangerous commands require a one-time confirmation and cannot receive a reusable scope.
- Non-read-only commands receive a safety score. Scores are cached for the session. As an experiment, scores at or above the configured threshold auto-approve; scores below it, unavailable scores, and dangerous commands still require confirmation. Hard policy gates remain independent.
- Approvals clear on session start, reload, or restart.

## Safety scorer configuration

Configure the scorer in Pi’s global `~/.pi/agent/settings.json`:

```json
{
  "commandSafety": {
    "provider": "nvidia",
    "model": "meta/llama-3.1-8b-instruct",
    "autoApproveScore": 70
  }
}
```

The provider/model must be available and authenticated. An unavailable score fails closed and shows the normal approval dialog.

## Dangerous commands

The session-approval classifier marks these as dangerous:

- any `sudo …` command
- `chmod 777 …` or `chmod a+rwx …`
- `dd` writing to a device, such as `dd … of=/dev/disk…`
- `mkfs*`, `fdisk`, `parted`, and `format`
- `shutdown`, `reboot`, `halt`, `poweroff`, and `init`
- the canonical shell fork bomb: `:(){ :|:& };:`
- any command matching a user-defined `permissionConfig.overrides.dangerous` pattern

The separate `permission-gate.ts` hard policy may also block or require confirmation for additional commands, including secret access, destructive Git operations, and recursive deletion. Git commits and pushes are evaluated by this extension’s safety scorer.
- In print/non-interactive mode, unapproved commands are blocked.

This extension does not maintain permission levels or register `/permission` commands. The separate `permission-gate.ts` extension remains the hard-policy layer for protected paths, credentials, Git rules, and destructive operations.

## Development

```bash
npm install
npm test
```
