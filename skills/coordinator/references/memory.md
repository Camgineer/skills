# Project state and shared files

## Project home

For a repository, initialize `<project-root>/.coordinator/` and add `.coordinator/` to its root `.gitignore`. Reuse that home and its recorded coordinator on subsequent invocations. The project root is the agreed repository checkout, not the parent of git's internal directory. Pass the absolute home to every thread, including threads in other worktrees.

When Python 3 and git execution are available, run [scripts/init_project.py](../scripts/init_project.py) with the agreed root as its argument. It creates missing state, preserves existing files and verifies ignore behavior. For a non-git project, use the member's working folder; the initializer creates state without a gitignore requirement.

With file tools only, perform the equivalent setup:

1. Inspect the root, existing state and `.gitignore`. Preserve existing content. If coordination state is already tracked, surface it for an explicit decision before writing private state.
2. Create `.coordinator/memory/`, `threads/` and `files/`. Create `PROJECT.md` and `memory/MEMORY.md` only when absent.
3. In a repository, append `.coordinator/` to root `.gitignore` if needed, preserving its contents and newline. Verify state is ignored with git when available; otherwise record that verification remains pending.

Setup is complete when the directories and index exist, the project brief is populated from known context, existing state is preserved, and repository ignore behavior is verified. Leave the `.gitignore` change visible for the project's normal commit workflow. Coordination state stays local and untracked.

Use a different home only when the member chose one or the environment cannot provide repo-local persistence. Record that exception and transfer the same logical state through supported storage. A local folder on an ephemeral disk needs a persistent handoff before reclamation; keep private state out of commits. The conversation can hold a compact handoff when no durable store exists.

## Project brief and memory

`PROJECT.md` holds the current goal, success criteria, priorities, constraints, participants and shared decision/resource pointers. Thread records hold executable task state. Record the coordinator conversation or handle and execution mode when available, so another invocation can reconnect. Build the brief from context and update it when commitments change.

Save information a replacement coordinator would otherwise ask for or rediscover:

| Type | Content |
|---|---|
| `user` | Work-relevant role, goals and preferences. |
| `feedback` | Guidance about what to repeat or avoid, with the member's reason and when to apply it. Record successes as well as corrections. |
| `project` | Decisions, commitments and rationale absent from current code and task records, with their application. |
| `reference` | An external source's location and purpose. |

Apply the harness's retention and privacy rules. Shared project storage is visible to its readers; personal details and private feedback need appropriate authorization. Keep secrets in the host's secret mechanism. Retain facts and decisions rather than code structure, repository instructions, git history or transient task progress, whose sources remain authoritative.

Write topic files under `memory/`, each with `name`, a specific `description`, and `metadata.type` in YAML frontmatter. Include source, date and scope; keep each under 4 KB. Index them in `memory/MEMORY.md` using a relative link and one-line description. Read the index and relevant entries rather than downloading the whole store.

Update existing topics instead of duplicating them. Convert relative dates using the member's timezone; distinguish commitments from proposals. Check current sources before answering solely from saved facts, and label unverified facts as last known. Follow the host's controls for a member's remember/forget request.

## Thread records

Keep `threads/<slug>.md` as the handoff for each focused outcome. The coordinator creates the record and owns assignment and dependencies; the executor owns progress and evidence after handoff. Route later edits through the current writer or use the store's version controls. If the host also tracks tasks, link them to this record rather than maintaining competing histories.

Record actual values, using `null` for inapplicable or unavailable fields:

```yaml
title: Fix login redirect
status: queued
asked_by: Sam
asked_at: 2026-10-17T14:02:00-04:00
request_source: member message or accessible conversation link
mode: worker
owner: null
conversation: null
project_home: /work/project/.coordinator
repository: /work/project
branch: thread/fix-login-redirect
workspace: /work/worktrees/fix-login-redirect
pull_request: null
completion_condition: merged fix
updated_at: 2026-10-17T14:02:00-04:00
```

Keep these sections below the metadata:

- **Request:** original member words and source, plus later corrections with context.
- **Context:** relevant memory pointers, defaults, dependencies and shared-file ownership.
- **Authorization:** sourced member decisions relevant to consequential steps.
- **Progress:** verified result, checks, open questions and next action with its owner.
- **Outputs:** accessible links/paths and whether delivery occurred.
- **Follow-up:** subscription/schedule IDs, last handled event or revision, and stop condition.

### States

| State | Criterion |
|---|---|
| `queued` | Accepted; no confirmed executor is working. |
| `running` | A confirmed owner is executing the next action. |
| `blocked` | A concrete obstacle prevents execution; recovery action and owner are recorded. |
| `waiting-on-member` | A named member decision, access grant or approval is required. |
| `waiting-on-external` | CI, review, another thread or another external result is pending, with a check mechanism recorded. |
| `paused` | A member suspended work; resumption awaits their direction. |
| `done` | The requested outcome was delivered and its completion condition is satisfied. |
| `dropped` | A member cancelled or explicitly accepted abandoning the work. |

Update at dispatch, meaningful transitions, delivery and handoff. Advice can finish when answered; thanks is optional. A ready PR remains active until its agreed completion condition. A closed, unmerged PR requires a recorded reason and reassessment of the original goal. Follow-ups may reopen completed records.

## Recovery

On resume, compare nonterminal records with live owners, workspaces, outputs and PRs. Reuse a running owner. For a lost executor, preserve files, locate the last verified result and resume from its saved next action. Preserve member-paused and cancelled states.

After uncertain dispatch, inspect existing jobs before retrying. An `already running` response may mean the new brief was not delivered: verify receipt and use the supported follow-up route. Recover a missing workspace through the host before recreating it. Consolidate overlapping records under one owner while retaining member instructions.

## Shared files

Store lasting shared inputs and deliverables under `files/<thread-slug>/` unless the member named a destination; keep scratch elsewhere. Prefer targeted text reads on remote storage, where a broad search can download every file.

Give each shared mutable file one owner, including the project brief and memory index. Other writers save proposed changes separately and send their pointers to the owner. Pass this ownership rule to every worker using shared storage.

Before changing a shared file, re-read it, preserve unrelated content and keep the edit small. Use transactions, version checks or atomic writes when available; verify read-back after the store's documented delay. Serialize conflicting writers through the owner. A read-back alone is not a lock.
