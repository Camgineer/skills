---
name: swag
description: "One design workflow for aesthetic direction, palette suggestions, critique and polish, expressive motion, and web accessibility. Use /swag with a page, component, or brief. Requires four installed companion skills."
disable-model-invocation: true
license: Apache-2.0
---

# Swag

Turn a brief or existing interface into a finished design through four installed skills. Read each skill's instructions when entering its stage. This file owns their order and handoffs; the companion skills own their methods.

## Establish the target

Resolve the requested page, component, or brief from the request and project context. Read the relevant source, existing design guidance, assets, and constraints. For an existing page, inspect its render and capture a before screenshot when browser tools are available. Preserve factual content and working behavior. Ask only when a missing choice changes the work and cannot be resolved from context.

Treat a request to polish as refinement within the existing identity. Replace the visual direction only when the request authorizes redesign. For a review-only request, assess each stage without editing source; return findings and recommendations.

Find all four companion skills before editing. Prefer the runtime's named skill locations. Otherwise check project `.agents/skills` and `.claude/skills`, then `~/.agents/skills` and `~/.claude/skills`. Select one installed copy per name and resolve its supporting files relative to that copy. If a dependency is missing or unreadable, name it and stop before edits. Installation and upstream credits are in [README.md](README.md) and [CREDITS.md](CREDITS.md).

## Run the stages in order

### 1. Frontend-design owns aesthetic direction

Read and apply the installed `frontend-design` skill to this target and brief. Set the visual direction before implementation. For refinement, describe the incumbent identity and the changes that fit it. For new work or redesign, choose a direction grounded in the subject and audience.

Complete this stage with a compact design brief covering the primary action, layout, typography, palette, and the element that gives this work its character. Check that each choice follows the request. Carry this same brief into the remaining stages.

Keep a coherent existing palette unless the request opens color for exploration. When color is open, suggest two or three palette directions with representative swatches or tokens, semantic roles, and a short reason each suits the subject. Recommend one and continue within the existing authorization; ask only when a brand decision remains unresolved. Established palettes such as Radix Colors, Open Color, or the project's design system are useful starting points. Read their actual tokens from the installed package or official source instead of approximating them. A custom palette is equally valid when it serves the brief; explain its rationale and check contrast in every used state. Name the chosen source or mark the palette as custom in the handoff.

### 2. Impeccable owns critique and polish

Read the installed `impeccable` skill and run its setup from the target project, using that installation's base directory. Pass a concrete task to its critique and polish playbooks so it enters the work rather than its no-argument menu. Load the playbooks and quality guidance they require.

Use the stage-one brief as the visual authority. Critique the target, fix issues within scope, and implement or refine the design with impeccable's guidance. For new work or redesign, follow its applicable new-work route before polishing. Keep the requested page as the deliverable; documentation, hooks, and unrelated project repairs require their own task scope.

Complete this stage when the primary task works, the design matches the brief, and the critique's in-scope issues are fixed or recorded with a concrete reason. Pass any interaction that could benefit from motion to stage three.

### 3. Animate owns motion

Read the installed `animate` skill. Supply the concrete interactions, their purpose, expected use frequency, and swag's motion direction as its task; its greeting-only path applies to an invocation without a task.

Give visible state changes presence. Entrances, exits, hover, press, selection, and feedback should ease between states rather than snap. Use the animator's toolkit deliberately: anticipation, acceleration and deceleration, follow-through, and small squash or stretch where the material and interaction support it. Make one coherent motion language; a reading surface can feel composed while an expressive page can feel physical.

Use animate's implementation sequence, existing project tokens, and the simplest suitable tool. In swag, its frequency gate scales amplitude and duration rather than removing feedback. This motion direction overrides animate's blanket veto on keyboard-triggered and frequent actions. Keep task completion and focus timely; motion accompanies the state change and never delays activation. Static content needs no continuous animation. Real-time progress and direct manipulation must stay faithful to the input rather than acquire artificial lag.

Use animate's sourced curves, timing, interruption, and pointer guidance. For gesture weight, preserve velocity through reversal; for a press, a small compress-and-settle can carry the response. Keep text readable during deformation. Respect reduced-motion settings with gentler fades or another accessible treatment. Preserve an immediate, usable focus indicator even when its surrounding treatment eases. Inspect rapid repeated input, keyboard use, entry and exit, and the reduced-motion treatment. Finish with the motion decisions and implemented parameters.

### 4. Web-design-guidelines owns the final web review

Read the installed `web-design-guidelines` skill and fetch its current guidelines as instructed. Give it the exact changed files and review them against every applicable rule. Fix in-scope findings, then recheck affected behavior and capture the after screenshot at the same viewport and state as before.

If the guidelines cannot be fetched, report that this stage is incomplete. Use available local guidance for useful checks, with its age or source identified; never label that fallback a current-guidelines pass. For a native-only target, report this web review as not applicable and use impeccable's native verification instead.

## Resolve overlaps

- The request, accessibility needs, functional correctness, and project constraints bound every stage. When a pinned visual choice creates an access barrier, preserve its intent with an accessible treatment and explain the tradeoff.
- Frontend-design selects the visual direction. Impeccable improves its execution and may expose a mismatch with the brief; revise the brief explicitly before changing direction.
- Swag sets the motion direction above; animate owns its implementation. Route motion suggestions from impeccable through animate instead of running two animation implementations. Its default preference for stillness yields to swag's eased feedback; its accessibility and interruption safeguards remain binding.
- Web-design-guidelines checks web behavior and access. Its review does not select a replacement aesthetic. Fix a finding in the owning stage, then rerun the affected downstream checks.
- Keep the brief's and project's copy conventions when a guideline's style preference conflicts with them. Record the intentional exception; accessibility and behavior findings still need a fix.
- Carry existing authorization through the workflow. Companion greetings, menus, and optional follow-up questions do not restart a settled brief. Preserve host restrictions on delegation; when independent critique assessments are prohibited, run them sequentially and disclose the reduced independence. Report unavailable tools and skipped checks as limits of the result.

## Finish with evidence

Return the implemented result or, for review-only work, prioritized findings with source locations. Briefly state the design direction, the outcome of all four stages, the motion decision, and any unresolved issue. Include before and after screenshots when available, plus the viewport sizes and interaction checks performed. Claim completion only for checks actually run. A screenshot proves appearance at that state; exercise the primary action, keyboard path, responsive layout, and reduced-motion behavior separately.
