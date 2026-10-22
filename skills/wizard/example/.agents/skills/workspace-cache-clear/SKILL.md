---
name: workspace-cache-clear
description: "Clear the example greeting cache after reviewing its irreversible consequence. Use when asked to remove that example cache."
---

# Clear example cache

Read [the command declaration](../../../scripts/workspace/cache/clear/command.ts) for the human prerequisite and consequence. Complete the prerequisite and obtain authorization for deletion. From the example root, run `make workspace/cache/clear CONFIRM=true`. Success reports that the example greeting cache is cleared and exits with zero.

Use `make workspace/cache/clear/wizard` when a human wants the prerequisite and confirmation prompts.
