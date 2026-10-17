# Harness capabilities

Use this reference at startup, when a tool or permission changes, and before promising asynchronous work. Inspect the current tool descriptions and supported interfaces. This skill does not install integrations, supply private APIs or create background infrastructure.

## Choose an execution mode

Use the best mode both available and authorized for this project:

| Mode | Requirements | Member experience |
|---|---|---|
| Dedicated conversation | The host can create or reuse a visible conversation, route follow-ups and return status, with permission for those operations. | Each outcome has an openable conversation; the coordinator handles project-wide triage. |
| Delegated worker | The host can run and track a worker with the required context and workspace. | Work has its own record; results return through the coordinator unless the host exposes a worker conversation. |
| Serial | No authorized delegation interface is available. | Focused work runs in this chat, one item at a time, with durable records when storage exists. |

Do not imitate a visible conversation using an invisible worker, start an undocumented CLI session, or edit a host's private database. If a tool requires an explicit request to create or message another conversation, obtain that request or use another permitted mode. Skill activation does not bypass the tool's rule.

Capacity is finite. Queue work that cannot start, separate independent tasks from dependent ones, and use supported waits or completion events rather than repeated unchanged polling. A worker that cannot continue after the parent ends is not durable background execution.

## Capability checks

| Capability | What to confirm | When unavailable |
|---|---|---|
| Conversation routing | Creation/reuse, project association, delivery, status and required authorization. | Use a permitted worker or serial mode. |
| Worker execution | Tools, workspace, accessible inputs, completion delivery and lifetime. | Execute serially or record a concrete blocker. |
| Workspace isolation | A real supported worktree, checkout, sandbox or equivalent; correct starting revision. | Serialize changes in the authorized workspace; never have multiple writers share a checkout. |
| Shared persistence | A location all intended owners can actually read and write, with suitable privacy and durability. | Transfer a compact handoff explicitly; if no durable store exists, state that continuity requires the saved conversation or an exported handoff. |
| File delivery | A returned link, attachment, artifact or path the member can access. | Deliver through the supported channel; do not call an inaccessible worker path a delivered result. |
| PR access | Repository identity, permissions, current branch/PR, checks and reviews. | Complete local work where possible and name the specific access needed. |
| Background events | A verified subscription or resumable execution facility and its lifetime. | Check during active turns; do not promise an unattended watch. |
| Scheduling | A supported scheduler, permission, target, timezone and persistence. | Record the intended next check and explain that it is not scheduled. |
| Device access | Which machine and folder a tool reaches, and whether it supports files, commands or browser interaction. | Use another authorized route or report the precise limitation. |

A parent and worker may expose different tools or files. Verify the worker's access rather than assuming inheritance. Pass essential context and inputs through supported attachments or accessible shared storage. Keep credentials in the host's secret mechanisms, out of briefs and project files.

## Isolated engineering work

Prefer the host's managed workspace mechanism when one exists, using its returned location and lifecycle operations. Reuse an appropriate workspace already attached to the task. Do not create a second worktree for a conversation that the host already isolated.

With ordinary git and no managed mechanism:

1. Inspect the current worktree, branches and repository instructions. Protect existing user changes. Find the actual base from the existing PR, a member's requested revision or the repository's verified default; never assume `main`, `origin` or the current branch is correct.
2. Choose a unique, safe slug and a new branch name following repository conventions, such as `thread/fix-login`. Keep raw member text out of shell interpolation. Check both the path and branch for collisions.
3. Fetch the relevant ref when a remote exists. Create a worktree from that ref using separate, properly quoted arguments. For a local-only repository use the agreed local base; for an unborn repository work serially until a base exists.
4. For an existing PR, use its actual head branch and commit. If the branch is already checked out, coordinate with its owner rather than forcing another checkout.
5. Record and verify the returned path and branch before dispatch. A worker must not silently create a different workspace when its assigned one is missing.

The project home is shared coordination state, independent of each worktree. Pass its absolute location explicitly. A gitignored `.coordinator/` in one checkout does not automatically appear in another.

## Events and schedules

A subscription delivers observations, not new authority. Re-read the live task or PR before acting; events may arrive late, repeat, or describe a state another worker already changed. Record handled event IDs when available, otherwise the relevant revision/check/review identifiers.

Use existing supported notifications for active PR work when permitted. Create scheduled follow-ups only when the user has requested recurring work or the harness explicitly permits that schedule within the current authorization. Reuse a matching schedule rather than creating another one per thread. Save its actual identifier, target, cadence, timezone, scope and cancellation condition.

Tell the member once what was successfully scheduled and any lifetime limitation. Stay quiet while nothing actionable changes; report a result, failure, meaningful change or required member action. The saved prompt must carry the original scope and point to current records, not assume it can perform new external actions.

Stop follow-ups when the member asks, the agreed completion condition is met, or no watched work remains. Cancel only schedules owned by this workflow; preserve unrelated routines. If a running job cannot cancel itself, use the host's supported disable mechanism or leave the cancellation action with the coordinator.
