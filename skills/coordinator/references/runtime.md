# Harness capabilities

## Execution

At startup and when capabilities change, inspect current tool descriptions and permissions. Select the best supported, authorized mode:

| Mode | Required capability | Delivery |
|---|---|---|
| Dedicated conversation | Create/reuse, route follow-ups, inspect status, and provide the assigned tools and inputs. | Results in an openable conversation. |
| Delegated worker | Dispatch with inputs and tools, track execution, receive completion. | Results through the coordinator unless the host exposes a conversation. |
| Serial | Execute in the current conversation. | Results here, one focused outcome at a time. |

Verify each capability independently: a conversation may lack workspace isolation, a worker may lack its parent's tools, and background work may end with the parent turn. Use only supported interfaces. Where a tool requires an explicit member request, obtain it or choose another permitted mode.

Check capabilities needed for the current work:

| Capability | Verification | Fallback |
|---|---|---|
| Isolation | Workspace, correct revision and exclusive writer. | Serialize changes in the authorized checkout. |
| Shared storage | All intended owners can access it; privacy and lifetime fit the work. | Transfer an explicit handoff and inputs. |
| Output delivery | The member can access the returned link, attachment, artifact or path. | Use another supported delivery channel. |
| PR access | Repository, permissions, head/base, checks and reviews. | Complete local work and name the missing access. |
| Events | Confirmed subscription or resumable execution and its lifetime. | Check during active turns. |
| Scheduling | Scheduler, authorization, target, timezone and persistence. | Save the next check as unscheduled. |
| Device access | Machine, folder, and whether the route supports files, commands or browser actions. | Use another authorized route or report the limitation. |

Pass worker inputs through accessible shared storage or supported attachments. Keep credentials in the host's secret mechanism. Queue work beyond capacity and use supported completion events or waits to advance it.

## Workspaces

Reuse a suitable workspace and the host's managed lifecycle when available. The shared project home stays at the location established by the coordinator; pass it explicitly across checkouts.

For ordinary git without managed isolation:

1. Inspect repository instructions, worktrees and existing changes. Resolve the base from the current PR, a member-specified revision or the verified repository default.
2. For an existing PR, use its actual head and coordinate with its current branch owner. For new work, select a unique path and branch under repository conventions; validate the slug and pass shell arguments safely.
3. Fetch the relevant remote ref when one exists. Create the worktree from that ref, or from the agreed base in a local-only repository. Use serial execution for an unborn repository until a base exists.
4. Verify the created workspace's path, branch and revision, then record them. Assignment is complete only after these match the intended task.

Code changes need isolated concurrent writers. Research or document work needs a checkout only when its inputs or outputs require one. Preserve existing user work before any checkout operation that could discard it.

## Events and schedules

Before promising asynchronous follow-up, confirm a supporting mechanism and its lifetime. Use authorized event subscriptions for active work. Create a schedule when a member requests recurring work or the harness permits it within existing authorization. Reuse a matching schedule and record its returned ID, target, cadence, timezone, scope and stop condition.

A scheduling step is complete when the host confirms it and the identifier is saved. Tell the member once what was scheduled and any lifetime limit. Without confirmation, describe the next check as unscheduled.

On each delivery, reconcile live task/PR state and skip duplicate or self-echo events. Save the handled event ID or relevant revision/check/review identifiers. Act within the original scope. Notify only on meaningful change, result, failure or required member action.

Stop owned follow-ups when directed, when their completion condition is met, or when no watched work remains. Use the host's supported cancel/disable mechanism and preserve unrelated routines. Record a pending cancellation action if this executor cannot perform it.

## Cleanup

After completion or cancellation, preserve delivered outputs and the recovery record. Inspect dirty files, unpushed commits and needed ignored files before removing an isolated workspace. Use the host's archive/remove mechanism when available; archive the conversation only when supported and authorized.

Cleanup is complete when retained work is recoverable and the owned workspace/follow-ups are removed or explicitly handed off. Preserve anything still needed for active work.
