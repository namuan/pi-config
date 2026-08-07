# Session command approvals

A vendored Pi extension that requires an explicit, session-only approval for non-read-only Bash commands.

## Behaviour

- Read-only commands such as `git status`, `ls`, `cat`, and `grep` run normally.
- Other simple commands offer these approval scopes:
  - the exact parsed command
  - its command/subcommand prefix, for example `npm run`
  - its executable prefix, for example `npm`
- Compound commands show a per-command breakdown and offer reusable scopes for each elevated command. Every elevated segment must be approved before the compound command runs.
- Dangerous commands require a one-time confirmation and cannot receive a reusable scope.
- Approvals clear on session start, reload, or restart.
- In print/non-interactive mode, unapproved commands are blocked.

This extension does not maintain permission levels or register `/permission` commands. The separate `permission-gate.ts` extension remains the hard-policy layer for protected paths, credentials, Git rules, and destructive operations.

## Development

```bash
npm install
npm test
```
