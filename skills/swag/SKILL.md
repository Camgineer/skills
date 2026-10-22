---
name: swag
description: "One web design workflow for aesthetic direction, palette suggestions, critique and polish, expressive motion, and accessibility. Use /swag with a web page, component, or brief. Requires four installed companion skills."
disable-model-invocation: true
license: Apache-2.0
---

# Swag

Turn a brief or existing web interface into a finished design through four installed skills. Read each skill's instructions when entering its stage. This file owns their order and handoffs; the companion skills own their methods.

## Establish the target

Resolve the requested page, component, or brief from the request and project context. Read the relevant source, existing design guidance, assets, and constraints. For an existing page, inspect its render and capture a before screenshot when browser tools are available. Preserve factual content and working behavior. Ask only when a missing choice changes the work and cannot be resolved from context.

Swag targets web interfaces. For a native-only target, report that it is outside this workflow's scope and stop before edits.

Treat a request to polish as refinement within the existing identity. Replace the visual direction only when the request authorizes redesign. For a review-only request, assess each stage without editing source; return findings and recommendations.

Find all four companion skills before editing. Prefer the runtime's named skill locations. Otherwise check project `.agents/skills` and `.claude/skills`, then `~/.agents/skills` and `~/.claude/skills`. Select one installed copy per name and resolve its supporting files relative to that copy. If a dependency is missing or unreadable, name it and stop before edits. Installation and upstream credits are in [README.md](README.md) and [CREDITS.md](CREDITS.md).

## Run the stages in order

### 1. Frontend-design owns aesthetic direction

Read and apply the installed `frontend-design` skill to this target and brief. Set the visual direction before implementation. For refinement, describe the incumbent identity and the changes that fit it. For new work or redesign, choose a direction grounded in the subject and audience.

Keep a coherent existing palette unless the request opens color for exploration. When choosing a palette, use the one the user named. Otherwise, pick soft pastel accents on neutral surfaces and make neighboring groups clearly distinct. Avoid the default blue/teal "AI" look unless the user or brand asks for it. Pass swag's soft-palette preference to frontend-design as part of the brief. Say which palette is chosen, offer alternatives with swatches or tokens and their semantic roles, and proceed without waiting for a choice. Switch if the user chooses another.

Established palettes and the project's design system are useful starting points. Read their actual tokens from the installed package or official source instead of approximating them. A custom palette is equally valid when it serves the brief; explain its rationale and check contrast in every used state. Name the chosen source or mark the palette as custom in the handoff.

Complete this stage with a compact design brief covering the primary action, layout, typography, palette, and the element that gives this work its character. Check that each choice follows the request. Carry this same brief into the remaining stages.

### 2. Impeccable owns critique and polish

Read the installed `impeccable` skill and run its setup from the target project, using that installation's base directory. Pass a concrete task to its critique and polish playbooks so it enters the work rather than its no-argument menu. Load the playbooks and quality guidance they require.

Use the stage-one brief as the chosen direction. Apply the design principles below during critique and polish. Critique the target, fix issues within scope, and implement or refine the design with impeccable's guidance. For new work or redesign, use its layout and build guidance within that direction. Skip its direction selection, repeated confirmation, and DESIGN.md replacement unless the request explicitly asks for them. Keep the requested page as the deliverable; documentation, hooks, and unrelated project repairs require their own task scope.

Complete this stage when the primary task works, the design matches the brief, and the critique's in-scope issues are fixed or recorded with a concrete reason. Pass any interaction that could benefit from motion to stage three.

### 3. Animate owns motion

Read the installed `animate` skill. Supply the concrete interactions, their purpose, expected use frequency, and swag's motion direction as its task; its greeting-only path applies to an invocation without a task.

For motion that passes animate's gate, give visible state changes presence through purposeful easing. Use the animator's toolkit deliberately: anticipation, acceleration and deceleration, follow-through, and small squash or stretch where the material and interaction support it. Make one coherent motion language; a reading surface can feel composed while an expressive page can feel physical.

Static content needs no continuous animation. Real-time progress and direct manipulation must stay faithful to the input rather than acquire artificial lag.

Follow animate for implementation choices and safeguards. Inspect rapid repeated input, keyboard use, entry and exit, and the reduced-motion treatment. Finish with the motion decisions and implemented parameters.

### 4. Web-design-guidelines owns the final web review

Read the installed `web-design-guidelines` skill and fetch its current guidelines as instructed. In edit mode, give it the exact changed target files. In review-only mode, give it the target files under review. Review that file set against every applicable rule. In edit mode, fix in-scope findings, then recheck affected behavior and capture the after screenshot at the same viewport and state as before. In review-only mode, report findings without changing source.

If the guidelines cannot be fetched, report that this stage is incomplete. Use available local guidance for useful checks, with its age or source identified; never label that fallback a current-guidelines pass.

## Resolve overlaps

- The request, accessibility needs, functional correctness, and project constraints bound every stage. When a pinned visual choice creates an access barrier, preserve its intent with an accessible treatment and explain the tradeoff.
- When a companion skill's default conflicts with swag's design principles, the principles win. Choose patterns that keep content visible and labels complete instead of defaults that cover content or truncate text.
- Frontend-design selects the visual direction. Impeccable improves its execution and may expose a mismatch with the brief; revise the brief explicitly before changing direction.
- Apply eased transitions to controls' interactive state changes when animate's gate allows motion. Keep decorative hover effects off ordinary cards. Frontend-design governs the single orchestrated entrance or ambient moment.
- Animate owns the motion gate, implementation, and safeguards, including reduced-motion support. Its exclusions for keyboard-triggered and frequently repeated actions remain binding. Route impeccable's motion suggestions through it.
- Web-design-guidelines checks web behavior and access. Its review does not select a replacement aesthetic. Fix a finding in the owning stage, then rerun the affected downstream checks.
- Keep the brief's and project's copy conventions when a guideline's style preference conflicts with them. Record the intentional exception; accessibility and behavior findings still need a fix.
- Carry existing authorization through the workflow. Companion greetings, menus, and optional follow-up questions do not restart a settled brief. Preserve host restrictions on delegation; when independent critique assessments are prohibited, run them sequentially and disclose the reduced independence. Report unavailable tools and skipped checks as limits of the result.

## Design principles

Apply these principles where the target has the corresponding content or interaction. Keep the main view calm even when the underlying content is complex.

- Show secondary detail only when an item is highlighted or selected. Disclose long lists progressively, with a clear way to reach the complete content.
- Keep details accessible without covering the content they explain. Identify the highlighted item, organize its details for scanning, and omit empty presentation fields.
- Show quiet, concise interaction guidance on the page. Adapt it to the available space and input method. Provide equivalent ways to act with a pointer, keyboard, and touch.
- Keep transient highlight distinct from deliberate, persistent selection. Selection must be easy to reverse, move, and clear. Dragging must never accidentally select an item.
- Fit large visual spaces to the viewport initially and adapt when it changes. Let people pan and zoom across the whole space, keep navigation centered on the user's point of interest, and preserve crisp text as scale changes.
- Let content determine the space it needs. Keep full names and labels readable without truncation, clipping, or overlap.
- Represent data faithfully. Preserve exact types and values, identify unknowns explicitly, and make the full set of allowed discrete values available when inspected.
- Explain every visual encoding in a plain-language legend. Meaning must remain understandable beyond color alone.
- Give connections and direction indicators enough space to read clearly. Endpoints must remain distinct from bends, labels, and neighboring content.
- Name each page for its actual content and purpose.

## Finish with evidence

Return the implemented result or, for review-only work, prioritized findings with source locations. Briefly state the design direction, the outcome of all four stages, the motion decision, and any unresolved issue. Include before and after screenshots when available, plus the viewport sizes and interaction checks performed. Verify applicable design principles against the rendered result and its real content and interactions. Claim completion only for checks actually run. A screenshot proves appearance at that state; exercise the primary action, keyboard path, responsive layout, and reduced-motion behavior separately.
