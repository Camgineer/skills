# Focused work

The coordinator owns project triage and dependencies; the thread owner owns one requested outcome and its conversation.

## Start or resume

1. Read the original ask and follow-ups, the thread record, project brief, relevant memory and applicable repository instructions. Apply [authority](../SKILL.md#authority) and [communication](conduct.md).
2. Verify your assignment, completion condition, project home and access to the brief's inputs and references. For repository work, verify the assigned workspace, branch and base under [workspaces](runtime.md#workspaces).
3. Confirm exclusive ownership of the task and any shared checkout before changing files. Resolve missing access or an absent workspace with the coordinator.
4. Record execution as started and establish the next action. Use the host's plan/status mechanism for multistep work and refresh it before long operations.

Start is complete when the owner, inputs, workspace and next action are verified. Record a concrete blocker for anything that prevents execution.

## Progress

At first assignment, begin with the progress checklist rather than a second greeting. Start with the first actual step. Refresh it as each step completes and before a long build, test or command. Use imperative wording for pending steps, present participles for running ones and past tense for completed ones. Keep delivery itself off the checklist; resolve each line to its real state before the result reply. Silent status edits track progress; results need a delivered message.

## Execute

Match the requested outcome: findings for an investigation, a recommendation for advice, or a validated change for implementation. Follow repository conventions and relevant specialist skills. Keep the change focused on the ask.

Validate changed behavior with the relevant available checks. Exercise UI behavior through a browser when applicable and available. Record observed results and unavailable checks. Inspect working-tree state and preserve unrelated changes before operations that can discard work.

**Shared state:** read [memory.md](memory.md#shared-files) before changing shared files or memory. Update the [thread record](memory.md#thread-records) at meaningful transitions with the verified result and next action. **PRs:** read [pr.md](pr.md) before pushing or handling a pull request.

## Steering and dependencies

Apply newer direct member instructions within their authority. Notify the coordinator when they change shared decisions, scope, priority or dependencies. Route follow-ups to the existing owner, including when reopening completed work.

Send cross-thread updates when another owner needs to act: a dependency unblocked, an interface changed, a member decision is needed, execution failed, or work was delivered. Send pointers to the record and outputs through a supported, authorized route. If no route exists, return a handoff through the parent or current conversation and record delivery as pending.

## Delivery

Return the result, blocker or needed decision in the working conversation through its actual delivery channel. Use the requested format and attach or link accessible outputs. If there is no separate conversation, return the result to the coordinator for delivery here. Include relevant verification and practical limits.

Delivery is complete when the member can access the result; a checklist update or inaccessible worker path is insufficient. Apply the [state criteria](memory.md#states) before marking the outcome done. For remaining work, save its next action, owner and resume mechanism. Reconcile the plan with the actual result before handoff. The coordinator handles [cleanup](runtime.md#cleanup).
