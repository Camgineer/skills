# Terminal interaction checks

[The main recording](wizard.cast) is an asciinema v2 recording of real PTY output at 80 columns and 28 rows. It shows the raw command before the assisted flow, then `make wizard` navigating to and running a command. Both paths use the same runner. It also shows a nested command, its human prerequisite and irreversible confirmation, a failed command with recovery guidance, and clean menu cancellation.

| Recording | Terminal state | Verified behavior |
|---|---|---|
| [Main flow](wizard.cast) | 80 columns, dark accents | Root menu, command execution, hidden input, results, raw command, nested confirmation, error, cancel. |
| [Narrow](narrow.cast) | 28 columns | Wrapped prompts and guidance, complete results, naturally wrapped raw command. |
| [Long menu](long-menu.cast) | 28 columns, eight long command labels | Scroll to and run the final command with its complete label and highlighted help. |
| [No color](no-color.cast) | 40 columns, `NO_COLOR=1` | No ANSI color codes; status words and keyboard guidance remain. |
| [Light](light.cast) | 80 columns, light accents | Soft accents without a forced foreground or background. |
| [History and reduced motion](static.cast) | 28 columns | History remains between steps; command progress uses a static status line. Keyboard prompts still redraw. |

Only fake secrets were entered. Their plaintext is absent from every recording. All successful interactive flows returned zero; the deliberate command error returned a nonzero status. The engine returns 130 on cancellation. Make preserves failure and can append its own error footer; shell chains stop.

The design follows [swag's terminal route](../../swag/references/terminal.md). The quiet command desk uses terminal-owned neutral colors, complete labels, and one focused task per screen. Verification covers narrow and wide terminals, light and dark accents, `NO_COLOR`, redirected output, and cancellation. Navigation guidance stays inside its frame at 28 columns. Progress communicates activity without a completion percentage, and reduced motion uses a static status line.

These recordings establish the listed widths and states. Terminal palettes vary, and the light and dark presets require an explicit choice; the default inherits the terminal palette. The [terminal regression](../engine/command.test.ts) sends Ctrl-C twice while progress is visible, verifies a single closing banner and the raw command before Make's error footer, and checks that a SIGINT-resistant descendant stops. Windows descendant cancellation and screen-reader compatibility are not established by these POSIX recordings.
