import { stripVTControlCharacters } from 'node:util';
import { createRedactor, secretMask } from './redaction.ts';
import { Cancelled, cancelledExitCode, createInterruption } from './interruption.ts';
import { createTerminal } from './terminal.ts';
import type { Terminal } from './terminal.ts';

export { Cancelled, cancelledExitCode } from './interruption.ts';
export type { Terminal } from './terminal.ts';

export type InputValue = string | number | boolean;
type InputBase = {
  name: string;
  prompt: string;
  help: string;
  required: boolean;
  secret: boolean;
};
export type Input = InputBase & (
  | { kind: 'text'; default?: string }
  | { kind: 'number'; default?: number }
  | { kind: 'confirm'; default?: boolean }
  | { kind: 'choice'; options: readonly { value: string; label: string }[]; default?: string }
);
export type CommandContext = {
  root: string;
  wizard?: true;
  signal: AbortSignal;
  terminal: Terminal;
};
export type Command = {
  name: string;
  help: string;
  inputs: readonly Input[];
  stages?: readonly { name: string; help: string }[];
  irreversible?: string;
  interactive?: boolean;
  run: (inputs: Readonly<Record<string, InputValue>>, context: CommandContext) => string | Promise<string>;
};

const terminalControlCharacters = /[\x00-\x08\x0b-\x1f\x7f]/g;

export function secretInputs(definition: Command): readonly Input[] {
  return definition.inputs.filter(input => input.secret);
}

export function populatedSecretInputs(definition: Command, inputs: Readonly<Record<string, InputValue>>): readonly Input[] {
  return secretInputs(definition).filter(input => inputs[input.name] !== undefined && String(inputs[input.name]) !== '');
}

const variableName = /^[A-Z][A-Z0-9_]*$/;
const reservedNames = new Set([
  'CONFIRM', 'PATH', 'SHELL', 'HOME', 'PWD', 'USER', 'LOGNAME', 'MAKE', 'MAKEFLAGS', 'MFLAGS',
  'MAKEFILES', 'MAKEFILE_LIST', 'MAKELEVEL', 'MAKEOVERRIDES', 'GNUMAKEFLAGS', 'MAKESHELL', 'VPATH',
  'SUFFIXES', 'GPATH', 'CURDIR', 'MAKECMDGOALS', 'MAKE_HOST', 'MAKE_VERSION',
  'MAKE_RESTARTS', 'MAKE_TERMOUT', 'MAKE_TERMERR', 'NODE_OPTIONS', 'NODE_PATH',
  'LD_PRELOAD', 'LD_LIBRARY_PATH', 'DYLD_INSERT_LIBRARIES', 'DYLD_LIBRARY_PATH', 'BASH_ENV', 'ENV', 'IFS',
  'WIZARD_ENGINE', 'COMMANDS',
]);
const kinds = new Set(['text', 'number', 'confirm', 'choice']);

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate);
}

function isLabel(candidate: unknown): candidate is string {
  return typeof candidate === 'string' && candidate.trim().length > 0 && !/[\x00-\x1f\x7f]/.test(candidate);
}

export function validateDefinition(candidate: unknown): asserts candidate is Command {
  const validCommand = isRecord(candidate) && isLabel(candidate.name) && isLabel(candidate.help)
    && Array.isArray(candidate.inputs) && typeof candidate.run === 'function';
  if (!validCommand) throw new Error('Export a definition with name, help, inputs, and run.');

  const names = new Set<string>();
  for (const input of candidate.inputs as unknown[]) {
    const validInput = isRecord(input) && isLabel(input.name) && variableName.test(input.name)
      && !reservedNames.has(input.name) && !input.name.startsWith('WIZARD_')
      && isLabel(input.prompt) && isLabel(input.help) && typeof input.required === 'boolean'
      && typeof input.secret === 'boolean' && typeof input.kind === 'string' && kinds.has(input.kind);
    if (!validInput) throw new Error('Each input needs a safe uppercase name, prompt, help, required, secret, and kind.');
    if (names.has(input.name as string)) throw new Error(`Duplicate input ${input.name}.`);
    names.add(input.name as string);

    const choice = input.kind === 'choice';
    if (choice) {
      const options = input.options;
      const validOptions = Array.isArray(options) && options.length > 0 && options.every(
        option => isRecord(option) && isLabel(option.value) && isLabel(option.label),
      );
      if (!validOptions) throw new Error(`${input.name} needs nonempty choice options.`);
      const values = options.map(option => option.value);
      if (new Set(values).size !== values.length) throw new Error(`${input.name} has duplicate options.`);
    } else if ('options' in input) {
      throw new Error(`${input.name} accepts options only for choice inputs.`);
    }

    if ('default' in input) {
      const expectedType = input.kind === 'confirm' ? 'boolean' : input.kind === 'number' ? 'number' : 'string';
      if (typeof input.default !== expectedType) throw new Error(`${input.name} has an invalid default type.`);
      parseInput({ ...input, default: undefined } as Input, String(input.default));
    }
  }

  const invalidInteractive = 'interactive' in candidate && typeof candidate.interactive !== 'boolean';

  if (invalidInteractive) {
    throw new Error('interactive must be a boolean.');
  }
  if ('irreversible' in candidate && !isLabel(candidate.irreversible)) {
    throw new Error('irreversible must describe the consequence.');
  }
  if ('stages' in candidate) {
    const validStages = Array.isArray(candidate.stages) && candidate.stages.every(
      stage => isRecord(stage) && isLabel(stage.name) && isLabel(stage.help),
    );
    if (!validStages) throw new Error('Human stages need a name and help line.');
  }
}

export function parseInput(input: Input, raw: string | undefined): InputValue {
  if (input.secret && raw === secretMask) throw new Error(`${input.name}: replace the masked secret before running.`);
  const skippedChoice = input.kind === 'choice' && !input.required && raw === '';
  if (skippedChoice) return '';
  const missing = raw === undefined || raw === '';
  if (missing && input.default !== undefined) return input.default;
  if (missing && input.required) throw new Error(`${input.name} is required. ${input.help}`);
  if (missing) return '';
  if (raw!.search(terminalControlCharacters) !== -1) {
    throw new Error(`${input.name} cannot contain terminal control characters.`);
  }

  if (input.kind === 'number') {
    const number = Number(raw);
    if (raw!.trim() === '' || !Number.isFinite(number)) throw new Error(`${input.name} needs a finite number.`);
    return number;
  }
  if (input.kind === 'confirm') {
    if (raw !== 'true' && raw !== 'false') throw new Error(`${input.name} needs true or false.`);
    return raw === 'true';
  }
  if (input.kind === 'choice' && !input.options.some(option => option.value === raw)) {
    throw new Error(`${input.name} needs one of its declared choices.`);
  }
  return raw!;
}

export function safeOutput(message: string, secrets: readonly string[] = []): string {
  const redactor = createRedactor(secrets);
  const safe = redactor.write(message) + redactor.finish();
  return stripVTControlCharacters(safe).replace(terminalControlCharacters, '');
}

export async function runCommand(definition: Command): Promise<void> {
  const interruption = createInterruption();
  const terminal = createTerminal(interruption);
  const catchesInterrupts = definition.interactive === true;

  if (catchesInterrupts) process.on('SIGINT', interruption.interrupt);

  let secrets: string[] = [];

  try {
    validateDefinition(definition);
    secrets = secretInputs(definition).map(input => process.env[input.name] || String(input.default ?? ''));
    const inputs = Object.fromEntries(definition.inputs.map(input => [input.name, parseInput(input, process.env[input.name])]));
    secrets.push(...secretInputs(definition).map(input => String(inputs[input.name])));
    if (definition.irreversible && process.env.CONFIRM !== 'true') {
      throw new Error('This action cannot be undone. Set CONFIRM=true after reviewing its consequence.');
    }

    const context = { root: process.cwd(), signal: interruption.signal, terminal };
    const result = await interruption.runInProcess(() => definition.run(inputs, context));

    const validResult = typeof result === 'string';

    if (!validResult) throw new Error('Command run must return a result string.');

    process.stdout.write(`${safeOutput(result, secrets)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Command failed.';

    process.stderr.write(`${safeOutput(message, secrets)}\n`);
    process.exitCode = error instanceof Cancelled ? cancelledExitCode : 1;
  } finally {
    process.removeListener('SIGINT', interruption.interrupt);

    if (catchesInterrupts) interruption.dispose();
  }
}
