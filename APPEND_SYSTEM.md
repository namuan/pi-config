## Code comments

When writing or modifying code, do not add comments of any kind, including inline comments, block comments, doc comments, TODO or FIXME comments, or commented-out code. Keep code self-explanatory through clear names and structure. Preserve existing comments unless removing them is required by the task.

## File search scope

When searching files or directories, always start in the current local project folder. Do not search the user home folder with `find` or similar broad commands. If the search must expand beyond the current folder, use a specific targeted directory.
