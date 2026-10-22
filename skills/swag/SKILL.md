---
name: swag
description: "Use for look-and-feel work across web and native interfaces, terminal UIs and CLI output, diagrams, slides, generated images, and charts. Use for the visual form and layout of documents, Markdown, and emails, not for drafting their words. Sets visual direction and applies the surface's design and verification guidance."
license: Apache-2.0
---

# Swag

Make the requested surface look and feel deliberate, clear, and complete. Apply the shared principles first, then load the guidance for the actual medium. This skill owns the design principles and handoffs; companions own their methods and format requirements.

## Establish the target

Identify the audience, purpose, surface, output format, and viewing conditions from the request and existing work. Inspect the source and rendered result where available. Preserve factual content, working behavior, and established identity during refinement. Replace the direction only when the request authorizes redesign. For review-only work, inspect without editing and return findings with source locations.

Reuse the available brief and constraints. Ask only when a missing decision changes the result and cannot be resolved from context. Loading swag carries existing authorization; it does not authorize sending email, publishing, or unrelated changes.

## Shared design principles

- Write or revise every human-facing word on every surface with `simple-as-prose`, including UI copy, labels, buttons, errors, empty states, CLI messages, slide text, email copy, document prose, chart titles, and captions. Use `writing-for-agents` for agent-facing text, including skills, AGENTS.md, and prompts. Swag owns the form; the writing companions own the words.
- Ground the visual direction in the subject and audience. Keep the content hierarchy, type treatment, palette, and composition coherent across the chosen routes.
- Keep the main view calm and focused. Reveal secondary detail only for the highlighted or selected item on interactive surfaces. Disclose long lists progressively, with a clear way to reach the complete content. In static work, put supporting detail in a clearly connected secondary reading layer so it remains available without overwhelming the main message.
- Keep details accessible without covering the content they explain. Identify their subject, organize them for scanning, and omit empty presentation fields.
- Where interaction exists, show quiet, concise guidance on the surface. Adapt it to the available space and input method, with equivalent ways to act through pointer, keyboard, and touch where supported. Keep interactive actions accessible through the keyboard.
- Keep transient highlight distinct from deliberate, persistent selection. Selection must be easy to reverse, move, and clear. Dragging must never accidentally select an item.
- Let content determine the space it needs. Keep full names and labels readable without truncation, clipping, or overlap. Adapt composition to the actual viewing width, page, or frame.
- Fit large views to their frame and adapt when it changes. Where interaction exists, let people pan and zoom across the whole space, centered on their point of interest, while text stays crisp.
- Give connector ends and arrowheads clear space, with a straight approach that keeps them distinct from bends, labels, and neighboring content.
- Represent data faithfully. Preserve exact types and values, identify unknowns explicitly, and make the full set of allowed discrete values available. Layout changes must not simplify away meaning.
- Explain every visual encoding in a plain-language legend. Meaning must remain understandable beyond color alone.
- Give each page, view, or artifact a title that identifies its actual content, purpose, or supported finding.
- Use hierarchy, alignment, spacing, and typographic weight to direct attention. Decoration earns its place by helping the audience understand or act.
- Where motion is supported and appropriate, give state changes purposeful easing and weight. Respect reduced-motion preferences and keep actions responsive. Static work gets its presence from composition; it needs no simulated animation.

### Palette

Keep a coherent existing palette and respect the host's theme unless the request opens color for exploration. When choosing a palette, use the one the user named. Otherwise, choose soft pastel accents on neutral surfaces with distinct neighboring groups. Avoid the default blue/teal "AI" look unless the user or brand asks for it. Treat this preference as part of the brief. Name the chosen palette, show alternatives with swatches or tokens and their semantic color roles, and proceed without waiting for a choice. Switch if the user chooses another.

Use actual tokens from an established palette or the project's system instead of approximating them. A custom palette is equally valid when it serves the brief; explain the rationale. Verify contrast in each used state and medium. Accessibility, truthful data encoding, and terminal or document theme constraints take priority over softness.

## Choose the surface route

Choose by the audience's task and delivery medium, not the filename alone. An HTML email follows the email route; a chart in a dashboard needs both the chart and web routes. Load only the relevant references. For a mixed artifact, keep one visual direction and apply each route to the part it owns.

| Surface | Load when | Guidance |
|---|---|---|
| Web interfaces | Building, refining, or reviewing browser UI | [Web](references/web.md) |
| Terminal UIs and CLI output | Designing commands, prompts, status, or terminal layouts | [Terminal](references/terminal.md) |
| Documents and Markdown | Formatting a reading or print artifact | [Documents](references/documents.md) |
| Diagrams | Explaining structure, relationships, or flows | [Diagrams](references/diagrams.md) |
| Slides | Designing a presentation or deck | [Slides](references/slides.md) |
| Emails | Designing a message or email template | [Emails](references/emails.md) |
| Generated images | Creating or refining a raster visual | [Images](references/images.md) |
| Charts | Encoding data in any medium | [Charts](references/charts.md) |

For another surface, including native applications, apply the shared principles with the host's relevant platform or format companion. Preserve its native conventions and verify in that medium; browser guidance is specific to the web route.

Resolve the writing companions specified in [Shared design principles](#shared-design-principles) before any route writes or revises text. Add the companions needed by the chosen surface route. Prefer the runtime's named skill locations, then project `.agents/skills` and `.claude/skills`, then their user-level equivalents. Read each selected companion before applying it and resolve supporting files relative to that copy. A missing required companion stops that route before edits. Optional companions have the fallback stated by the route. A terminal or document task does not depend on the web stack. Source and license limits are in [CREDITS.md](CREDITS.md).

## Resolve overlaps

- The request, accessibility, functional correctness, data truth, and format requirements bound every route. Preserve a pinned visual intent with an accessible treatment when needed and explain the tradeoff.
- When a companion's default conflicts with swag's principles, the principles win. Choose patterns that keep content visible and labels complete. Surface guidance adapts the principles to the medium; it does not waive them.
- The brief's and project's copy conventions take precedence over companion copy guidance. For human-facing words, simple-as-prose takes precedence over other companions' copy advice, including impeccable's copy playbook and web-design-guidelines' title case. Record an intentional exception, and fix access or behavior defects.
- Carry settled choices and authorization through handoffs. Companion greetings, menus, and optional questions do not restart the brief. Preserve host restrictions on delegation and disclose any reduced independence in a review.

## Finish with evidence

Inspect the actual result in its delivery medium using the route's checks. Verify the applicable principles against real content and states. For mixed artifacts, check the combined result as well as its parts. Report the visual direction, selected routes, companion outcomes, and unresolved issues. Include rendered comparisons or captures where available and say which checks actually ran. A screenshot proves appearance at that state; interaction, data accuracy, export fidelity, and accessibility need their own checks.
