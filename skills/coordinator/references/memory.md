# Memory and shared files

## Memory

Project memory lives in `.coordinator/memory/` in the project root. Every member and every agent in the project shares it, and it outlives every chat. Whatever an agent learns survives only if it is written here.

Save what a fresh agent would otherwise have to ask again or spend effort rediscovering, and that will stay true: how members want to work, decisions they made, facts about the project.

### Types

| Type | Holds | Save it when | Body |
|---|---|---|---|
| `user` | A member's role, goals, knowledge and preferences, only as far as they bear on the work, and never a negative judgement | You learn any of these | The fact |
| `feedback` | Guidance on how to work: what to avoid and what to keep doing | A member corrects your approach, or confirms that a non-obvious approach worked. Record successes too, or you drift from what already works. | The rule, then a **Why:** line with the member's reason and a **How to apply:** line |
| `project` | Ongoing work, goals, decisions, bugs and incidents that the code and git history do not show: who is doing what, why, and by when | You learn them. Convert relative dates to absolute dates. | The fact or decision, then **Why:** and **How to apply:** lines |
| `reference` | Where information lives in external systems, and what it is for | You learn about such a resource | The pointer and its purpose |

### What stays out

- Code patterns, conventions, architecture, file paths and project structure, because reading the repository shows them.
- Git history and who changed what, because `git log` and `git blame` are authoritative.
- Debugging solutions and fix recipes, because the code and commit messages hold them.
- Anything already in the repository's agent instruction files.
- In-progress state, which belongs in the thread files.
- Secrets, API keys and credentials, ever.

### Format

Write each memory to its own file, `.coordinator/memory/<slug>.md`, organized by topic rather than by date:

```markdown
---
name: <short-kebab-case-slug>
description: <one specific line, used to decide relevance later>
metadata:
  type: user | feedback | project | reference
---

<the memory>
```

- Keep each file under 4 KB, and keep its name, description and type current with its content.
- Link related memories with `[[name]]`.
- Update an existing memory instead of writing a duplicate, and remove one that turns out to be wrong or outdated.
- `MEMORY.md` is the index, with one line per file: `- [[name]]: description`. Every coordinator reads it at start. Re-read it just before you change it, and keep every line you are not changing.

### Reading and changing memory

- When a member asks you to remember something, save it at once as whichever type fits. When they ask you to forget something, find it and remove it.
- Read memory when it seems relevant or a member mentions prior work, and always when a member asks you to check or recall.
- Memory goes stale. Before you answer from memory alone, check it against the current files or systems. When they conflict, trust what you see now and fix the memory.
- Memory is for future chats. A plan holds the current approach, and the thread file holds the current task's state.

## Thread files

`.coordinator/threads/<slug>.md` holds one thread's state. The coordinator creates it, and the thread keeps it current.

```markdown
# Fix login bug
status: running
chat: <the thread chat's id>
asked-by: Sam, 2026-10-17 14:02
branch: thread/fix-login-bug
worktree: .coordinator/worktrees/fix-login-bug
pr: none

## Ask
<the member's words, verbatim>

## Notes
<plan, current state and next step>
```

`status` is one of `running`, `waiting-on-member`, `done` or `dropped`.

## Shared files

`.coordinator/files/` holds anything another thread or a later question will need, such as cleaned data, computed results or long write-ups. Throwaway drafts and scratch work stay out of it.

- Put new outputs in a subdirectory named for your thread, unless the member named a path.
- Several agents may write here at once, and the last write silently replaces earlier ones. Re-read a file just before you change it and keep the edit small. After changing a file that already existed, read it back before relying on it, and re-apply your change to the current version if another write replaced it.
- When your brief names another thread as the owner of a file, write your changes to a new file and send its path to the coordinator's chat.
- Delete any temporary files you created here.
- Put these rules into the instructions of any helper agent you start that uses this folder.
