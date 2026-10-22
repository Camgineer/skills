# Terminal UIs and CLI output

Give the command's result and next action the strongest hierarchy. Use spacing, alignment, weight, and restrained dim text for secondary information. Essential facts must remain readable when emphasis is unavailable. Keep decoration and emoji noise out of the output.

Respect `NO_COLOR`, the terminal's capabilities, and the user's light or dark theme. Meaning must survive plain text and monochrome. Keep output stable when redirected or consumed by another program; presentation must not corrupt data or mix diagnostics into a data stream.

Adapt to the available width. Wrap full names and values without losing their association, and preserve complete content at narrow widths. A layout that works only at a wide development terminal is unfinished.

Keep progress calm and truthful. A spinner communicates activity, not invented completion. Use restrained updates in an interactive terminal and durable status in logs or redirected output. Cancellation must stop work cleanly, restore the terminal, and leave a truthful final state.

For an interactive TUI, make navigation, focus, selection, and recovery understandable with the inputs it supports. Keep help available without covering the active content. Use the terminal's established interaction conventions.

Before finishing, inspect narrow and wide output, light and dark themes, `NO_COLOR`, plain or redirected output, and cancellation where supported. Exercise the real command or interaction path. Record unsupported checks rather than claiming compatibility from a styled transcript.
