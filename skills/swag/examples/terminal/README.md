# Terminal sample

Swag's terminal route was applied to real repository history. The [before capture](before.txt) comes from `git log -3 --no-decorate --color=never --abbrev=8 --oneline`. The [example formatter](history.py) reads the same Git records and gives subjects more visual weight than hashes, with space between entries and wrapping to the available width.

The captures use history at `a3ac78ae487fd7e33a6c72acda92b8701dee3916`. The formatter reads the current repository, so running it against later history produces different records. No subject or hash is invented or omitted.

## Before and after

Before:

```text
a3ac78ae feat: apply swag across every surface
83988e98 feat: swag design rules (#5)
6ae18d73 feat: swag design skill (#4)
```

After at 28 columns:

```text
Recent changes

  feat: apply swag across
  every surface
  a3ac78ae

  feat: swag design rules
  (#5)
  83988e98

  feat: swag design skill
  (#4)
  6ae18d73
```

The complete captures are available at [28 columns](after-28.txt), [40 columns](after-40.txt), and [80 columns](after-80.txt).

## Checks performed

- At 28, 40, and 80 columns, the complete subjects and hashes remain present, and lines fit the requested width.
- In a pseudo-terminal, headings and subjects use bold weight and hashes use dim text. `NO_COLOR` and `TERM=dumb` remove styling without changing content.
- Redirected output contains no escape sequences. No foreground or background colors are emitted, so the example inherits the terminal's theme.
- This command has no spinner, prompts, selection, or long-running work. Cancellation is handled without changing terminal modes; interruption and appearance in physical light and dark terminals were not separately exercised.

## Reproduce

From a Git repository:

```sh
python3 skills/swag/examples/terminal/history.py
COLUMNS=28 python3 skills/swag/examples/terminal/history.py
NO_COLOR=1 python3 skills/swag/examples/terminal/history.py
```

The styled appearance requires an interactive terminal with emphasis support. Plain output keeps the hierarchy through ordering, spacing, and indentation.
