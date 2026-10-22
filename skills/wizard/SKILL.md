---
name: wizard
description: "Give every repository script a raw Make target, an assisted terminal wizard, and a command skill. Use when wiring scripts into Make, adding commands or namespaces, or improving terminal prompts and command discovery."
license: Apache-2.0
---

# Wizard

Install one engine and give each command one declaration. Raw Make targets, interactive wizards, and command skills all reach the same command code. This applies to every script operation, including queries, reports, maintenance, builds, and setup.

Read [README.md](README.md) for the runnable example and terminal settings. Read [GLOSSARY.md](GLOSSARY.md) when distinguishing commands, namespaces, inputs, and human stages.

## Wire a repository

1. Inspect the repository's scripts, Make targets, package manager, and skill directory. Inventory every script operation and map each to a command path. Preserve the existing process logic behind the command's `run` function. Each operation has a raw target, wizard entry, and command skill before this step is complete.
2. Install this entire folder as `.agents/skills/wizard/` and keep the engine there. Install its runtime dependencies with `npm ci --omit=dev --prefix .agents/skills/wizard`. Ignore `.agents/skills/wizard/node_modules/`. Commit or reproducibly install the skill folder and its lockfile. Updating the installed skill upgrades the shared engine; keep repository-specific logic under `scripts/`.
3. Require Node 24 and ESM (`"type": "module"` in the repository's package manifest). Add this package import so commands at every depth use the same path:

   ```json
   {
     "imports": { "#wizard": "./.agents/skills/wizard/engine/command.ts" }
   }
   ```

4. Add these Make rules. Merge the declarations with existing conventions. The command list comes from the filesystem. Keep the raw rule a **static pattern rule** with the discovered targets before `%: scripts/%/run.ts`. A bare implicit `%` rule resolves nested paths incorrectly.

```make
.DEFAULT_GOAL := wizard
WIZARD_ENGINE := .agents/skills/wizard/engine
COMMANDS := $(shell node $(WIZARD_ENGINE)/cli.ts list-commands)
.EXPORT_ALL_VARIABLES:
.PHONY: wizard check-commands $(COMMANDS)

wizard:
	@node $(WIZARD_ENGINE)/cli.ts wizard

%/wizard:
	@node $(WIZARD_ENGINE)/cli.ts wizard $*

$(COMMANDS): %: scripts/%/run.ts
	@node $<

check-commands:
	@node $(WIZARD_ENGINE)/cli.ts check-commands
```

   Recipes use literal tab indentation. Variables reach Node through the environment; keep input expansions such as `$(SQL)` out of recipe text. Paths contain lowercase kebab-case segments. Reserve the segment `wizard` and the root path `check-commands`. Every folder containing either entry file must contain both entry files. Namespace folders contain descendants and need no declaration.

5. Add the TypeScript 7 compiler (`@typescript/native-preview`, pinned to the version in this skill's package manifest) and Node 24 types to the repository's development dependencies. Typecheck the consuming scripts and installed engine together. Exclude `.agents/skills/wizard/engine/**/*.test.ts` from the consuming repository typecheck; the skill runs its tests with its own development dependencies. Use `strict`, `module: "NodeNext"`, `noEmit`, `allowImportingTsExtensions`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`. Node runs `.ts` files directly. Use erasable syntax and explicit `.ts` import extensions.

Complete wiring when `make check-commands`, the repository typecheck, a raw command, `make wizard`, and a nested namespace wizard pass. Exercise cancellation and a fake secret in the installed layout.

## Add a command

Create `scripts/<path>/command.ts` and a thin `run.ts`. Export `definition` from the declaration. Keep module initialization and all transitive imports free of side effects; discovery imports declarations. Load costly dependencies inside `run`.

```typescript
// scripts/db/read/command.ts
import type { Command } from '#wizard';

export const definition = {
  name: 'Read records',
  help: 'Run a read-only query.',
  inputs: [{
    name: 'SQL',
    prompt: 'Which query should run?',
    help: 'Enter a read-only SQL statement.',
    required: true,
    secret: false,
    kind: 'text',
    default: 'SELECT 1',
  }],
  async run(inputs, { root }) {
    const { readRecords } = await import('./read-records.ts');
    return readRecords(String(inputs.SQL), root);
  },
} satisfies Command;
```

```typescript
// scripts/db/read/run.ts
import { runCommand } from '#wizard';
import { definition } from './command.ts';

await runCommand(definition);
```

`run` receives validated inputs and a `CommandContext` with `root`, `signal`, and `terminal`, and returns a result string. Perform all command work there. Return output instead of printing it. Run subprocesses with closed stdin and captured output so the wizard owns interaction. Await subprocess completion and keep descendants in the command process group.

Each input declares `name`, `prompt`, `help`, `required`, `secret`, and `kind`. Names are uppercase Make variable names. The checker rejects execution-control names such as `PATH`, `SHELL`, `MAKEFLAGS`, `NODE_OPTIONS`, and `WIZARD_*`. Use a descriptive name such as `ACCOUNT_NAME` rather than an ambient shell name such as `USER`.

| Kind | Value | Optional declaration |
|---|---|---|
| `text` | String | `default: 'value'` |
| `choice` | One declared option value | `options: [{ value: 'safe', label: 'Safe' }]`, `default: 'safe'` |
| `confirm` | Boolean | `default: false` |
| `number` | Finite number | `default: 1` |

`choice` requires nonempty, unique options. Defaults must match the kind and allowed choices. Omitted optional inputs use their default when declared, otherwise `''`. An explicit Skip on an optional choice yields `''` even when it has a default. A required input can have a default. Keep real credentials out of declarations and defaults. `secret: true` uses hidden entry for every kind; its help must explain the expected format or choice values.

Add business validation inside `run`, such as integer bounds or read-only query restrictions. Raw targets and wizards share that validation. An input's `required` flag checks presence; `false` remains a valid confirmation input.

For irreversible actions, set `irreversible` to a precise consequence, including the affected resource. The wizard asks for confirmation with cancel selected. The raw runner requires `CONFIRM=true`; the closing command includes it after confirmation. Human stages run before inputs and execution, one at a time:

```typescript
stages: [{ name: 'Review the resource', help: 'Finish work that needs the selected resource before removing it.' }],
irreversible: 'This permanently removes the selected resource.',
```

Stages describe work only a human can do, and pause for explicit completion. Raw operators and agents complete these prerequisites themselves. Use interactive execution when a command needs typed input between automated operations. Consult the [terminal reference](README.md#terminal-behavior) for interruption behavior.

## Run an interactive command

Set `interactive: true` when command work asks questions or needs cancellable progress. Omission means false; supplied values must be boolean. The wizard completes declaration inputs, human stages, and irreversible confirmation, then calls `run` in process with `wizard: true`. Raw execution calls the same definition without that flag. Existing commands keep their child execution in the wizard and Node's default SIGINT handling in raw execution.

Use only the context's terminal methods for command prompts. They share the engine's prompt instance and cancellation signal. Check `process.stdin.isTTY && process.stdout.isTTY` before asking human questions. Keep piped output machine-readable; progress is silent when stdout is redirected.

```typescript
async run(inputs, { signal, terminal }) {
  await requestCode(String(inputs.EMAIL), signal);

  const code = await terminal.password('Enter the code', value => {
    const missingCode = !value?.trim();

    if (missingCode) return 'Enter the code from your email.';
  });

  return terminal.withProgress(() => verifyCode(code, signal));
},
```

The context exports `CommandContext` and `Terminal` through `#wizard`. Terminal methods include `showStep(title)`, `text(message, validate?)`, `password(message, validate?)`, `confirm(message, { initialValue })`, `info(message)`, and `withProgress(operation)`. Validation returns a message or `undefined`. Passwords remain hidden; validation messages must describe the required format without including the entered secret. A code gathered inside `run` stays out of declaration inputs, replay arguments, environment variables, and logs. Returned results are redacted against declared secret inputs; keep command-collected secrets out of results too.

For commands that opt into interactive execution, pass `signal` to command I/O and honor abort during cleanup. The engine owns cancellation; consumers need no SIGINT listener or abort controller. A transport can combine this signal with a request timeout. The first Ctrl-C aborts it, and a second forces exit 130 if work ignores abort. Throw the exported `Cancelled` for explicit cancellation; its default message is `Cancelled.`. An aborted command cannot report success even if it returns normally.

Wrap only long operations in `terminal.withProgress`. It calls the operation once and removes progress on success, failure, or cancellation. Ask questions outside that operation so progress never competes with a prompt. Use [the sign-in example](example/scripts/sign-in/command.ts) for a complete command.

## Name and wire the command skill

Name each command's skill after its script path in kebab-case. For example, `scripts/db/read` maps to `make db/read` and skill `db-read`. `scripts/check-names` maps to `make check-names` and skill `check-names`. The checker rejects path pairs that flatten to the same skill name and verifies that each command has a skill with that name in its frontmatter.

Create `.agents/skills/<kebab-path>/SKILL.md`. Its description names the operation and when an agent should use it. Its body tells the agent to read the command declaration for inputs and consequences, complete human prerequisites, and call the raw Make target with named variables. Link the declaration relative to the skill. Include a concrete raw invocation and its success condition. Keep command behavior and input reference in the declaration.

Use `make db/read SQL='SELECT 1'`. Named variables preserve `=` inside values. Shell quoting protects shell metacharacters; Make also expands `$`, so a literal dollar needs `$$` inside a single-quoted assignment. The wizard handles both quoting layers. Use the [terminal reference](README.md#terminal-behavior) for secret masking, replay, and cancellation behavior.

## Preserve the terminal experience

Follow [the terminal behavior and settings](README.md#terminal-behavior) when adding commands. Keep one focused task per screen, full labels, highlighted help, and truthful status. Use the engine's shared prompts and progress renderer so commands retain the same interaction.

Confirm an irreversible consequence immediately before execution. Return concise results; write large results to artifacts and return their paths. Keep transformed secrets out of logs. Prefer opaque tokens when the operation permits them. When using very short secrets, read the [redaction limits](README.md#terminal-behavior) before exposing the result.

## Check in CI

`check-commands` validates discovered declarations, paired entry files, input kinds and defaults, reserved names, command skill name collisions, and the presence and frontmatter name of each command skill. It imports declarations and never calls `run`. Typechecking remains a separate check.

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 24
      cache: npm
  - run: npm ci
  - run: npm ci --omit=dev --prefix .agents/skills/wizard
  - run: make check-commands
  - run: npm exec tsgo -- --noEmit
```

Use the repository's package manager equivalents where needed. Check completion through the raw target, the root and relevant nested wizard paths, and the command skill. Verify errors, secrets, narrow terminals, and cancel before handing off.
