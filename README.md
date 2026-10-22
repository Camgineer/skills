# Skills

Agent skills by Camgineer. Each folder under `skills/` is one installable skill. Copy the folder you want into your harness's configured skills directory.

| Skill | What it does |
|---|---|
| [coordinator](skills/coordinator/SKILL.md) | Acts as a project's chief of staff: triages requests, coordinates focused work, preserves context and follows results through delivery. Invoke it explicitly. |
| [simple-as-prose](skills/simple-as-prose/SKILL.md) | Writes and revises human-facing prose so the reader gets the point and knows what to do next. Install independently. |
| [swag](skills/swag/SKILL.md) | Runs frontend-design, impeccable, animate and web-design-guidelines as one design workflow. Invoke `/swag` with a page or brief. Requires all four skills. |

## Coordinator

Start a chat in your project with an explicit request such as:

> Use the coordinator skill as this project's continuing coordinator. Create and coordinate separate visible work chats for substantial outcomes, route my follow-ups to their owners, and check their progress and results.

Bring new requests, follow-ups and project-wide decisions to that chat. Ask for status whenever you need the current outcomes, dependencies and next actions.

The coordinator keeps one project view while each focused outcome has an owner and a work record. It supports engineering, research, documents and operational work. For code changes, it coordinates isolated workspaces and follows PRs through the agreed completion condition.

It adapts to the tools and permissions the harness actually provides:

- Dedicated visible conversations by default for substantial outcomes when supported and authorized.
- Delegated workers for supporting investigations and checks, or as a disclosed fallback when dedicated conversations are unavailable or unauthorized.
- Direct answers and small coordination in the current chat; serial execution when no delegation route is authorized.

If a host needs a separate explicit grant for chat creation or coordination, the coordinator asks for that scope once at setup and records your answer and its source. It reuses valid standing authorization on resume and later dispatch, subject to current host requirements. A host that requires a fresh request for each action still governs that action.

On startup in a repository, the coordinator uses the harness's file tools or available shell to create `.coordinator/` with project context, memory, thread records and shared files. It preserves existing state, adds `.coordinator/` to the root `.gitignore` and verifies that git ignores it when git execution is available. All worktrees share the same recorded project home. No extra language runtime is required.

A different storage location is an explicit exception for a chosen destination or an environment that cannot retain repo-local files. If durable storage, background execution or scheduling is unavailable, the coordinator says so and leaves a handoff instead of promising unattended work.

The skill contains the workflow and its supporting references in one folder. It requires no particular vendor, private API or companion service. It cannot add conversation UI, persistent execution, shared storage or permissions to a host that lacks them. Optional host-specific metadata does not change that contract.
