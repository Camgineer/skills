# Web interfaces

This route requires the installed frontend-design, impeccable, animate, and web-design-guidelines companions. Resolve all four before editing; name a missing companion and stop this route if any is unreadable. Inspect the existing render and capture a before screenshot when tools are available.

Run the four stages in order. Swag's shared principles and the chosen brief remain authoritative throughout.

## 1. Frontend-design owns aesthetic direction

Read and apply the installed `frontend-design` companion to this target and brief. Set the visual direction before implementation. For refinement, describe the incumbent identity and the changes that fit it. For new work or redesign, choose a direction grounded in the subject and audience.

Apply swag's shared palette rule as part of the brief passed to frontend-design.

Complete this stage with a compact design brief covering the primary action, layout, typography, palette, and the element that gives this work its character. Check that each choice follows the request. Carry this same brief into the remaining stages.

## 2. Impeccable owns critique and polish

Read the installed `impeccable` companion and run its setup from the target project, using that installation's base directory. Pass a concrete task to its critique and polish playbooks so it enters the work rather than its no-argument menu. Load the playbooks and quality guidance they require.

Use the stage-one brief as the chosen direction. Apply swag's shared principles during critique and polish. Critique the target, fix issues within scope, and implement or refine the design with impeccable's guidance. For new work or redesign, use its layout and build guidance within that direction. Skip its direction selection, repeated confirmation, and DESIGN.md replacement unless the request explicitly asks for them. Keep the requested page as the deliverable; documentation, hooks, and unrelated project repairs require their own task scope.

Complete this stage when the primary task works, the design matches the brief, and the critique's in-scope issues are fixed or recorded with a concrete reason. Pass any interaction that could benefit from motion to stage three.

## 3. Animate owns motion

Read the installed `animate` companion. Supply the concrete interactions, their purpose, expected use frequency, and swag's motion direction as its task; its greeting-only path applies to an invocation without a task.

For motion that passes animate's gate, give visible state changes presence through purposeful easing. Use the animator's toolkit deliberately: anticipation, acceleration and deceleration, follow-through, and small squash or stretch where the material and interaction support it. Make one coherent motion language; a reading surface can feel composed while an expressive page can feel physical.

Static content needs no continuous animation. Real-time progress and direct manipulation must stay faithful to the input rather than acquire artificial lag.

Follow animate for implementation choices and safeguards. Inspect rapid repeated input, keyboard use, entry and exit, and the reduced-motion treatment. Finish with the motion decisions and implemented parameters.

## 4. Web-design-guidelines owns the final web review

Read the installed `web-design-guidelines` companion and fetch its current guidelines as instructed. In edit mode, give it the exact changed target files. In review-only mode, give it the target files under review. Review that file set against every applicable rule. In edit mode, fix in-scope findings, then recheck affected behavior and capture the after screenshot at the same viewport and state as before. In review-only mode, report findings without changing source.

If the guidelines cannot be fetched, report that this stage is incomplete. Use available local guidance for useful checks, with its age or source identified; never label that fallback a current-guidelines pass.

## Web handoffs

- Frontend-design sets the direction. Impeccable improves its execution; a mismatch with the brief requires an explicit revision before changing direction.
- Use eased transitions for interactive control states when animate allows motion. Keep decorative hover effects off ordinary cards. Frontend-design governs the single orchestrated entrance or ambient moment.
- Animate owns the motion gate, implementation, and safeguards, including reduced motion. Its keyboard and frequency exclusions remain binding. Route impeccable's motion suggestions through it.
- Web-design-guidelines owns the final behavior and access review. Its review does not select a replacement aesthetic. Fix a finding in its owning stage, then rerun affected downstream checks.

Finish by inspecting responsive layouts, full content, focus, the primary action, repeat input, and reduced motion. Report each stage's outcome and any missing check. Capture the after state at the same viewport and state as before where possible.
