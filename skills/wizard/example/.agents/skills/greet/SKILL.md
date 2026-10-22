---
name: greet
description: "Print an example greeting with a chosen tone, repetition count, and capitalization. Use when asked to run the example greeting."
---

# Greet

Read [the command declaration](../../../scripts/greet/command.ts) for inputs and validation. From the example root, run `make greet NAME='A=B' TONE=friendly COUNT=1 LOUD=false`. Success prints the greeting and exits with zero.

Use only fake secrets when exercising the optional hidden input. Use `make greet/wizard` when a human wants assisted input.
