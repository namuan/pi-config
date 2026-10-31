## Do

- Plan before big feature. Write what user wants. Check it works.
- Before done, run test. Show result.
- Changing state? Follow user action. Check for leaks, skipped items, old data.
- User outcome named? Work back from it. Check full flow, not just broken part.
- Picking tool or runtime? Check env and project setup. Use what fits. Say what's missing.
- Found extra stuff or existing control? Remove or reuse. Don't add more.
- Hard failure happening again? Add logs at steps. Look at them before fix.

## Avoid

- Don't add extra features. Keep to what user asked.
- Don't say fix works just from code change. Show what you tested vs what you didn't.
- Don't swap tool or runtime for easy. Check it fits the rule first.

## How they talk

- Keep prompts short and talk-like. Give plan for multi-step work.
- Offer approach. Let developer steer. When they say change, change.
- Before finish, sum up what changed and show test result.

## Code comments

No comments. Inline, block, doc, TODO, FIXME — none. Code should explain itself. Keep old comments unless you must remove them.

## File search

Search only the local project folder. Never the home dir with find. Need more? Use a specific folder.
