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

Only fake secrets were entered. Declaration-secret plaintext is absent from the original recordings listed above. All successful interactive flows returned zero; the deliberate command error returned a nonzero status. The engine returns 130 on cancellation. Make preserves failure and can append its own error footer; shell chains stop.

The design follows [swag's terminal route](../../swag/references/terminal.md). The quiet command desk uses terminal-owned neutral colors, complete labels, and one focused task per screen. Verification covers narrow and wide terminals, light and dark accents, `NO_COLOR`, redirected output, and cancellation. Navigation guidance stays inside its frame at 28 columns. Progress communicates activity without a completion percentage, and reduced motion uses a static status line.

These recordings establish the listed widths and states. Terminal palettes vary, and the light and dark presets require an explicit choice; the default inherits the terminal palette. The [terminal regression](../engine/command.test.ts) sends Ctrl-C twice while progress is visible, verifies a single closing banner and the raw command before Make's error footer, and checks that a SIGINT-resistant descendant stops. Windows descendant cancellation and screen-reader compatibility are not established by these POSIX recordings.

## Interactive commands

| Recording | Verified behavior |
|---|---|
| [Code entry and progress](interactive-sign-in.gif) | `make sign-in/wizard` gathers an email, creates a fake inbox code, accepts hidden entry in process, loads the profile with progress, and prints a replay with only the email. |
| [One interrupt for raw work](raw-interrupt.gif) | A raw noninteractive command ignores its context signal and waits on a 60-second timer. One Ctrl-C exits 130 before completion. |
| [Two interrupts for interactive work](interactive-force-stop.gif) | The first Ctrl-C aborts the signal and stops animated progress. The operation keeps waiting. The second Ctrl-C exits 130 and restores canonical terminal mode, signals, and echo. |

These are real local PTY sessions at 80 columns and 24 rows. The GIF renderer reads their output through a terminal emulator and rasterizes each screen with the local Menlo font. The pure-JavaScript `gifenc` encoder writes the GIFs in Node. The corresponding [sign-in](interactive-sign-in.cast), [raw interrupt](raw-interrupt.cast), and [forced stop](interactive-force-stop.cast) casts preserve the original output and timing. The inbox code is generated locally and has no credentials or external service behind it. Its typed entry is masked; only the deliberately displayed fake inbox contains the digits.

Run the recorder from the wizard folder after installing its optional rendering tools:

```sh
npm ci
npm install --prefix node_modules/.proof --no-package-lock --no-save @xterm/headless@5.5.0 @resvg/resvg-js@2.6.2 gifenc@1.0.3
node recordings/record-interactive.mjs
```

The recorder uses its own processes and no browser. Its command fixtures are TypeScript modules checked with the engine. The interrupt recordings print `stty -a` after the command so terminal restoration is visible. These captures establish POSIX behavior; they do not establish Windows terminal or screen-reader behavior.

The sign-in flow also passes local PTY checks at 28 columns with dark accents, 80 columns with light accents, 40 columns with `NO_COLOR=1`, and 28 columns with reduced motion. Each completes successfully; no-color output contains no ANSI color codes, and reduced-motion output contains no animated spinner frames. These checks inspect the real output and do not change the GIF palette.
