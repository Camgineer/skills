---
name: sign-in
description: "Sign in to the example with a one-time code that a person types. Use when asked to run the example sign-in."
---

# Sign in with a code

Read [the command declaration](../../../scripts/sign-in/command.ts) for its input. The command asks for a code after it starts, so it needs a person at a terminal. Ask them to run `make sign-in EMAIL=you@example.com` from the example root, or `make sign-in/wizard` for assisted input. Success prints `Signed in as` and the email, and exits with zero.

Without a terminal the command exits with an error instead of waiting for a code.
