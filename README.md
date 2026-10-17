# Skills

Agent skills by Camgineer. Each folder under `skills/` is one installable skill. Copy the folder you want into your harness's configured skills directory.

| Skill | What it does |
|---|---|
| [coordinator](skills/coordinator/SKILL.md) | Acts as a project's chief of staff: triages requests, coordinates focused work, preserves context and follows results through delivery. Invoke it explicitly. |
| [simple-as-prose](skills/simple-as-prose/SKILL.md) | Writes and revises human-facing prose so the reader gets the point and knows what to do next. Install independently. |

## Coordinator

Start a chat in your project and ask the agent to use the `coordinator` skill as the project's coordinator. Bring new requests, follow-ups and project-wide decisions to that chat. Ask for status whenever you need the current outcomes, dependencies and next actions.

The coordinator keeps one project view while each focused outcome has an owner and a work record. It supports engineering, research, documents and operational work. For code changes, it coordinates isolated workspaces and follows PRs through the agreed completion condition.

It adapts to the tools and permissions the harness actually provides:

- Dedicated conversations when the host supports and authorizes creating and routing them.
- Delegated workers when available and authorized, with results returned to the coordinator.
- Serial execution in the current chat when delegation is unavailable.

On startup in a repository, the coordinator creates `.coordinator/` with project context, memory, thread records and shared files, and adds `.coordinator/` to the root `.gitignore`. The included initializer preserves existing state and verifies that git ignores it; equivalent file-tool setup is available when command execution is unavailable. All worktrees share the same recorded project home.

A different storage location is an explicit exception for a chosen destination or an environment that cannot retain repo-local files. If durable storage, background execution or scheduling is unavailable, the coordinator says so and leaves a handoff instead of promising unattended work.

The skill contains the workflow and its supporting references in one folder. It requires no particular vendor, private API or companion service. It cannot add conversation UI, persistent execution, shared storage or permissions to a host that lacks them. Optional host-specific metadata does not change that contract.
