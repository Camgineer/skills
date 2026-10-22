# Swag

`/swag` runs four installed design skills as one workflow. It sets the visual direction, suggests palettes, critiques and polishes the interface, adds motion with easing and weight, and checks the result against current web guidelines.

It keeps an existing palette unless color is open for exploration. When choosing a palette, swag uses the one named in the request or picks a soft palette, names it, and offers alternatives without waiting for a choice. Established palettes are starting points; a custom palette is welcome when it fits the brief and passes contrast checks.

The design keeps the main view calm, reveals detail without covering content, and makes interactions discoverable. Content stays readable and data stays exact. Palettes use soft accents on neutral surfaces rather than the default blue/teal "AI" look, unless the request or brand asks for it.

Swag adds motion only where animate allows it. Actions triggered by the keyboard and very frequent actions stay still. Small squash and stretch, follow-through, and responsive settling give other interactions easing and weight. Reduced-motion preferences get a gentler treatment.

## Install

Install these companion skills in the same environment as swag. They remain separate dependencies and retain their own licenses. Sources and license limits are in [CREDITS.md](CREDITS.md).

- `frontend-design`
- `impeccable`
- `animate`
- `web-design-guidelines`

From the repository root, copy the skill into the harness directories in use:

```sh
mkdir -p ~/.claude/skills ~/.agents/skills
cp -R skills/swag ~/.claude/skills/
cp -R skills/swag ~/.agents/skills/
```

## Use

```text
/swag Redesign the workshop page in index.html. Keep the content and booking link.
/swag Polish the settings form while preserving its current identity.
/swag Review the checkout page without changing files.
```

Swag uses the existing brief and project context. A missing dependency stops the workflow before edits. The final report names incomplete checks, including an unavailable guidelines fetch or browser.

## Sample

[The sample run](examples/README.md) includes a small workshop page, before and after screenshots, and the checks performed. Serve the example directory with any static server to inspect both versions.
