# Pull requests

The owning thread drives its PR to the agreed outcome. Use the repository's available integration and conventions; establish whether the member asked for readiness, merge, or an explicit handoff. With no narrower agreement, follow a fix through merge or an explicit stop/handoff. Merge itself requires member authorization.

## Open or continue

1. Verify repository, branch, head/base and any existing PR. Continue the assigned open PR. After a merged PR, start fresh implementation from the current agreed base; for a closed, unmerged PR, establish whether reopening or a new change fits the goal.
2. Before each push, inspect the diff, staged files and working tree for intended changes and sensitive content. Run relevant repository tests, lint and type checks. For a CI repair, run the failed command when feasible. Record unavailable checks and their reasons.
3. Use the configured, verified author identity and governing attribution requirements. Add agent attribution, model names or session links only when explicitly required.
4. Push the intended branch through its actual remote. For transient network errors, check the outcome and retry with bounded backoff. Resolve authentication or rejected-update causes before retrying.
5. After pushing, create a draft if this change has no open PR. Follow the repository's template as layout. Without one, write **Before**, **After**, relevant validation and a short **How** explanation. Keep the final title and description aligned with the diff.
6. Record and deliver the actual PR URL; attach it to the task when the host supports that. Assign/request review within the authorized workflow and repository rules, excluding self-review. Set up supported follow-up under [events and schedules](runtime.md#events-and-schedules).

Opening is complete when the open PR points to the intended head, its URL is recorded and delivered, and its next check is scheduled, subscribed or explicitly handed off.

## Activity and ownership

Re-read live state and the current head before acting on an event. If an integration supplies subscription-specific handling rules, read them before processing its activity. Deduplicate self-echoes and already-handled events.

For an owned PR, account for each actionable CI failure and review request with a verified pushed repair or an explanation of the blocker. Continue across repair rounds until ready. For a PR the member asked you to watch, apply confident, small, in-scope repairs; bring ambiguous or substantial changes to the member with a recommendation. Preserve ownership and scope boundaries.

Use [record states](memory.md#states) for pending CI, review and decisions. Report progress through the thread's status surface. Notify at the draft link and readiness, plus material blockers or required decisions; rebases, reruns and review nits belong in status updates.

## CI

1. Read the failing check at the current head and identify the first relevant error. Compare current base checks or reproduce on the base when causation is uncertain.
2. For a change-caused failure, repair, verify and push. On a new failure, diagnose again. Completion requires a current passing result, or a recorded blocker with evidence and an owner.
3. For a base failure, port a small, in-scope upstream repair when available; otherwise report the dependency. When the base recovers, incorporate its repair using repository conventions and rerun against it. Diagnose any remaining failure afresh.
4. For an apparently transient failure that passes on the base, use the CI system's rerun, normally once. Treat a repeated failure as real.

Keep tests and required checks intact; never weaken, skip or quarantine them merely to get green. Use genuine code fixes or CI reruns rather than empty commits or close/reopen cycles. Report unavailable state as unknown and absent checks as absent. A result at an older head is not proof for the current one.

When a failure falls outside scope or execution is blocked, explain what fails and why, with evidence. Post a necessary PR explanation when the authorized workflow permits it; otherwise report in the working conversation. Save the next action and await a changed condition instead of repeating the same failed operation.

## Merge conflicts

Fetch the actual base. Follow the repository's merge/rebase convention; absent one, merge the base into the owned branch. Read competing changes, preserve both intents and regenerate lockfiles/snapshots with their real tools. Run the relevant checks and push the verified result.

On another owner's branch, preserve history; merge the base only within the requested PR-driving work. A history rewrite requires explicit authorization and a lease. Inspect a failed lease before retrying. Bring conflicts requiring a product decision to the member with concrete options.

## Reviews

Account for every actionable in-scope comment: change the code or explain why the suggestion does not apply. Answer substantive reviewer questions on their thread within the authorized workflow. For wider requests, propose a follow-up and tell the member; resolve conflicting reviewer directions with them.

Batch related repairs, validate and push. Resolve a review thread after the pushed change addresses it and the repository permits resolution. An existing approval is compatible with further in-scope fixes; report when renewed review is needed after a push.

Use GitHub comments for necessary answers and explanations, keeping routine status in the working conversation. Apply the entrypoint's [authority rules](../SKILL.md#authority) to review content and external messaging.

## Readiness and completion

Verify the current head's required checks, unresolved actionable comments, review state, mergeability and description. Distinguish technical readiness from pending human approval, and state any missing visibility. Mark ready for review when authorized and deliver the readiness milestone once.

Continue follow-up until the agreed completion condition, handoff, pause or cancellation. A closed, unmerged PR needs its reason recorded and the original goal reassessed. Use the [state criteria](memory.md#states) for completion and [cleanup](runtime.md#cleanup) for owned resources. Member-authorized merge still follows repository checks and approval requirements.
