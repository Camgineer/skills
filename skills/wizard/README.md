# Wizard

Every repository command gets the same three entry points: a raw Make target, an assisted terminal flow, and a skill for agents. The installed engine owns discovery, prompts, validation, execution, and the closing raw command. Each repository owns its command definitions and process logic.

Install the entire folder as `.agents/skills/wizard/`. Follow [SKILL.md](SKILL.md) to wire a repository and add commands. The engine runs in place so an installed skill update upgrades it. [CREDITS.md](CREDITS.md) records the upstream inspiration and prompt library.

## Run the example

Use Node 24 and GNU Make. From this folder:

```sh
npm ci
npm run check
npm test
make -C example check-commands
make -C example wizard
```

The tests use the prebuilt `@lydell/node-pty` development dependency; no native build toolchain is required. The typecheck uses the pinned TypeScript 7 compiler. Node runs TypeScript directly, with erasable syntax only.

| Entry | Result |
|---|---|
| `make -C example greet NAME='A=B'` | Print a greeting through the raw runner. |
| `make -C example sign-in/wizard` | Collect an email, display a fake inbox code, accept hidden entry, and show profile progress. |
| `make -C example greet/wizard` | Prompt for text, a choice, a number, a confirmation, and an optional fake secret. |
| `make -C example workspace/wizard` | Open the workspace namespace. |
| `make -C example workspace/cache/wizard` | Open a nested namespace. |
| `make -C example workspace/cache/clear/wizard` | Complete a human prerequisite and confirm the irreversible action. |

The nested command removes only the example's `.cache/greeting.txt`. Its raw target requires `CONFIRM=true`. The example maps `#wizard` to the same installed engine path used by consuming repositories; its engine directory is a symlink to the shared implementation. The commands have agent skills under [the example skill directory](example/.agents/skills).

## Terminal behavior

The flow uses the terminal's font, foreground, and background. A muted magenta accent identifies the current step; green identifies completion, and yellow identifies a warning. Labels and status words carry the same meaning without color. The highlighted menu entry exposes its help. Lists scroll, full labels wrap, and each input occupies its own screen. The closing raw command uses natural terminal wrapping so copying preserves its exact text. GNU Make can append its own error footer when a command fails.

Text and number fields accept `?` for help. Choice fields have a help option. Secrets always use hidden entry. The engine masks exact secret strings in returned output. Very short secrets can mask parts of ordinary words in results. The closing command masks only populated secret arguments; public input values stay exact, and blank optional secrets are omitted. The masked command is a template; replace `[hidden]` before replay. Omitted inputs on raw replay use the current environment and declared defaults. Encoded or transformed secrets remain the command author's responsibility.

| Setting | Effect |
|---|---|
| `NO_COLOR=1` | Remove color, retaining status labels and keyboard feedback. |
| `WIZARD_THEME=light` or `dark` | Use soft accent colors matched to an explicitly selected background. |
| `WIZARD_REDUCED_MOTION=1` | Replace animated spinner frames with one static indicator. |
| `ACCESSIBLE=1` | Preserve screen history between steps. Keyboard prompts still redraw. |

Without a theme override, accents use the terminal's own palette. No background color is forced. Menus and input edits respond immediately. The spinner is the only continuous motion and stops on success, failure, or cancel. By default, the child runs with closed stdin and returns a result. Commands with `interactive: true` run in process, use the shared terminal for typed input, and show progress only around long operations. Progress stays off redirected stdout.

Ctrl-C restores the terminal. The engine exits with 130. GNU Make reports a nonzero status and its error footer, so `make x/wizard && next` stops after cancellation. Cancellation before execution leaves the command unrun. Interactive commands receive one abort signal for prompts, progress, and I/O. The first Ctrl-C aborts it; a second forces exit 130 if work ignores cancellation. Both paths restore terminal state. Raw commands without interactive execution retain Node's default SIGINT handling. For wizard child execution, interruption stops its process group on POSIX; effects already applied may remain. Windows cancellation stops the direct child and has weaker descendant guarantees. For child execution, the engine retains up to 1 MiB of output and marks omitted output. Large results belong in command-created artifacts.

## Evidence

[The terminal recording](recordings/wizard.cast) compares the raw flow with `make wizard`, then navigates to and runs a command at the same width. It also shows nested confirmation and cancellation. [The interaction notes](recordings/README.md) describe the verification states and terminal limits.

[The interactive command recordings](recordings/README.md#interactive-commands) show hidden code entry with progress and a raw command that ignores the signal stopping on its first Ctrl-C.
