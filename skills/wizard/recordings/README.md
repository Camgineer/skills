# Terminal interaction checks

[The main recording](wizard.cast) is an asciinema v2 recording of real PTY output at 80 columns and 28 rows. It shows the raw command before the assisted flow, then `make wizard` navigating to and running a command. Both paths use the same runner. It also shows a nested command, its human prerequisite and irreversible confirmation, a failed command with recovery guidance, and clean menu cancellation.

| Recording | Terminal state | Verified behavior |
|---|---|---|
| [Main flow](wizard.cast) | 80 columns, dark accents | Root menu, command execution, hidden input, results, raw command, nested confirmation, error, cancel. |
| [Narrow](narrow.cast) | 32 columns | Wrapped prompts and guidance, complete results, naturally wrapped raw command. |
| [Long menu](long-menu.cast) | 32 columns, eight long command labels | Scroll to and run the final command with its complete label and highlighted help. |
| [No color](no-color.cast) | 44 columns, `NO_COLOR=1` | No ANSI color codes; status words and keyboard guidance remain. |
| [Light](light.cast) | 80 columns, light accents | Soft accents without a forced foreground or background. |
| [History and reduced motion](static.cast) | 44 columns | History remains between steps; command progress uses a static status line. Keyboard prompts still redraw. |

Only fake secrets were entered. Their plaintext is absent from every recording. All successful interactive flows returned zero; the deliberate command error returned a nonzero status. The engine's cancel status is handled by the Make wrappers so cancellation produces no Make error footer.

The design pass uses swag's stage order. Direction sets a quiet command desk with terminal-owned neutral colors and one focused task per screen. Critique and polish check hierarchy, help disclosure, complete labels, errors, secret entry, and keyboard navigation in the real PTY. The motion gate keeps keyboard actions immediate and limits animation to progress; reduced motion uses a static status line. The final guidelines pass checks applicable keyboard, labeling, confirmation, error, and content-wrap rules. The mechanical detector reports no matches; it does not establish terminal quality. Web-only semantics and browser rendering do not apply to this terminal interface.

These recordings establish the listed widths and states. Terminal palettes vary, and the light and dark presets require an explicit choice; the default inherits the terminal palette. The adjacent terminal regression sends Ctrl-C twice while progress is visible, verifies the raw command is printed last, and checks that a SIGINT-resistant descendant stops. Windows descendant cancellation and screen-reader compatibility are not established by these POSIX recordings.
