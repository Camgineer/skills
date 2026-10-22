import * as clack from '@clack/prompts';
import { Writable } from 'node:stream';
import { discoverCommands } from './discovery.ts';
import type { DiscoveredCommand } from './discovery.ts';
import { cancelledExitCode, parseInput, safeOutput, secretInputs } from './command.ts';
import type { Input, InputValue } from './command.ts';
import { executeCommand, rawCommand } from './execution.ts';

// Keep only a few choices visible; Clack scrolls the remaining entries.
const menuItems = 4;
// A slow cadence keeps progress legible without animating keyboard interactions.
const spinnerFrameMs = 120;

// ANSI 256-color accents are opt-in; the default uses the terminal's own palette.
const softAccents = {
  light: { current: 97, success: 65, warning: 136 },
  dark: { current: 183, success: 150, warning: 223 },
};

class Cancelled extends Error {}

function enabled(setting: string | undefined): boolean {
  return setting !== undefined && setting !== "" && setting !== "0" && setting !== "false";
}

// Keep the terminal's own foreground and background; accents follow its palette.
class TerminalOutput extends Writable {
  get isTTY() { return process.stdout.isTTY; }
  get columns() { return process.stdout.columns; }
  get rows() { return process.stdout.rows; }
  _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    const noColor = Boolean(process.env.NO_COLOR);
    let frame = chunk.toString();
    if (noColor) frame = frame.replace(/\x1b\[(?:[34][0-9]|9[0-7]|10[0-7]|[34]8;5;\d+|[34]8;2;\d+;\d+;\d+)m/g, '');
    else {
      const theme = process.env.WIZARD_THEME;
      const accents = theme === 'light' ? softAccents.light : theme === 'dark' ? softAccents.dark : undefined;
      frame = frame.replaceAll('\x1b[36m', '\x1b[35m');
      if (accents) {
        frame = frame.replaceAll('\x1b[35m', `\x1b[38;5;${accents.current}m`)
          .replaceAll('\x1b[32m', `\x1b[38;5;${accents.success}m`)
          .replaceAll('\x1b[33m', `\x1b[38;5;${accents.warning}m`);
      }
    }
    process.stdout.write(frame, callback);
  }
}

export async function wizard(root: string, scope: string): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Wizard needs an interactive terminal. Use make <command> NAME=value for automation.');
  }
  const output = new TerminalOutput();
  const screen = { output };
  const controller = new AbortController();
  const prompts = { output, signal: controller.signal };
  const cancel = () => controller.abort();
  process.on('SIGINT', cancel);
  const commands = await discoverCommands(root);
  let ran = false;
  const inputs: Record<string, InputValue> = {};
  let chosen: DiscoveredCommand | undefined;

  function clearScreenAndShowStep(title: string) {
    if (!enabled(process.env.ACCESSIBLE)) output.write('\x1b[2J\x1b[H');
    clack.intro(title, screen);
  }
  async function answer<T>(promise: Promise<T>): Promise<Exclude<T, typeof clack.CANCEL_SYMBOL>> {
    const response = await promise;
    if (clack.isCancel(response) || controller.signal.aborted) throw new Cancelled();
    return response as Exclude<T, typeof clack.CANCEL_SYMBOL>;
  }
  async function ask(input: Input): Promise<InputValue> {
    while (true) {
      clearScreenAndShowStep(chosen!.definition.name);
      const validate = (raw: string | undefined) => {
        if (raw === '?' && !input.secret) return;
        try {
          parseInput(input, raw);
        } catch (error) {
          return error instanceof Error ? error.message : 'Check this value.';
        }
      };
      if (input.secret) {
        clack.log.info(input.help, screen);
        const secret = await answer(clack.password({ ...prompts, message: `${input.prompt} (hidden)`, validate }));
        return parseInput(input, secret);
      }
      if (input.kind === 'choice') {
        const help = Symbol('help');
        const options: { value: string | typeof help; label: string }[] = input.options.map(
          option => ({ value: option.value, label: option.label }),
        );
        if (!input.required) options.push({ value: '', label: 'Skip' });
        options.push({ value: help, label: 'Help' });
        const selected = await answer(clack.select({
          ...prompts, message: input.prompt, options, initialValue: input.default, maxItems: menuItems,
        }));
        if (selected !== help) return parseInput(input, selected);
        clack.log.info(input.help, screen);
        const resume = await answer(clack.confirm({ ...prompts, message: 'Return to this input?', initialValue: true }));
        if (!resume) throw new Cancelled();
        continue;
      }
      if (input.kind === 'confirm') {
        clack.log.info(input.help, screen);
        return answer(clack.confirm({ ...prompts, message: input.prompt, initialValue: input.default ?? false }));
      }
      const typed = await answer(clack.text({
        ...prompts, message: `${input.prompt} (? for help)`,
        defaultValue: input.default === undefined ? undefined : String(input.default),
        placeholder: input.default === undefined ? undefined : String(input.default), validate,
      }));
      if (typed === '?') {
        clack.log.info(input.help, screen);
        const resume = await answer(clack.confirm({ ...prompts, message: 'Return to this input?', initialValue: true }));
        if (!resume) throw new Cancelled();
        continue;
      }
      return parseInput(input, typed);
    }
  }

  try {
    if (!commands.length) throw new Error('No commands found. Add a command under scripts/ and run check-commands.');
    let level = scope;
    while (!chosen) {
      const exact = commands.find(command => command.path === level);
      const prefix = level ? `${level}/` : '';
      const descendants = commands.filter(command => command.path.startsWith(prefix) && command.path !== level);
      if (exact && !descendants.length) {
        chosen = exact;
        break;
      }
      if (!exact && !descendants.length) throw new Error(`No command or namespace named ${level}.`);
      const children = [...new Set(descendants.map(command => command.path.slice(prefix.length).split('/')[0]))];
      const options = children.map(child => {
        const path = `${prefix}${child}`;
        const childCommand = commands.find(command => command.path === path);
        const namespace = commands.some(command => command.path.startsWith(`${path}/`));
        return { value: path, label: namespace ? `${child}/` : childCommand!.definition.name,
          hint: namespace ? 'Commands' : childCommand!.definition.help };
      });
      if (exact) options.unshift({ value: ':run', label: `Run ${exact.definition.name}`, hint: exact.definition.help });
      if (level) options.push({ value: ':back', label: 'Back', hint: 'Parent menu' });
      clearScreenAndShowStep(level ? `Commands / ${level}` : 'Commands');
      const selection = await answer(clack.select({ ...prompts, message: 'Choose a command', options, maxItems: menuItems }));
      if (selection === ':back') level = level.split('/').slice(0, -1).join('/');
      else if (selection === ':run') chosen = exact;
      else level = selection;
    }
    for (const stage of chosen.definition.stages ?? []) {
      clearScreenAndShowStep(`${chosen.definition.name} / ${stage.name}`);
      clack.log.info(stage.help, screen);
      const completed = await answer(clack.confirm({ ...prompts, message: 'Is this step complete?', initialValue: false }));
      if (!completed) throw new Cancelled();
    }
    for (const input of chosen.definition.inputs) inputs[input.name] = await ask(input);
    if (chosen.definition.irreversible) {
      clearScreenAndShowStep(chosen.definition.name);
      clack.log.warn(chosen.definition.irreversible, screen);
      const confirmed = await answer(clack.confirm({ ...prompts, message: 'Run this action? It cannot be undone.', initialValue: false }));
      if (!confirmed) throw new Cancelled();
      inputs.CONFIRM = true;
    }
    clearScreenAndShowStep(chosen.definition.name);
    let spinnerTimer: NodeJS.Timeout | undefined;
    const frames = ['◒', '◐', '◓', '◑'];
    let frame = 0;
    const reducedMotion = enabled(process.env.WIZARD_REDUCED_MOTION);
    const wasRaw = process.stdin.isRaw;
    const wasFlowing = process.stdin.readableFlowing;
    const cancelKey = (chunk: Buffer | string) => {
      const keys = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
      if (keys.includes('\x03') || keys === '\x1b') cancel();
    };
    const spinner = {
      start: () => {
        // Handle cancel keys here so Make's foreground process group stays alive for cleanup.
        process.stdin.setRawMode(true);
        process.stdin.on('data', cancelKey);
        process.stdin.resume();
        if (reducedMotion) {
          clack.log.step('Running', screen);
          return;
        }
        const draw = () => {
          output.write(`\r\x1b[2K\x1b[35m${frames[frame]}\x1b[39m  Running`);
          frame = (frame + 1) % frames.length;
        };
        draw();
        spinnerTimer = setInterval(draw, spinnerFrameMs);
      },
      finish: () => {
        process.stdin.removeListener('data', cancelKey);
        process.stdin.setRawMode(wasRaw);
        if (wasFlowing !== true) process.stdin.pause();
        clearInterval(spinnerTimer);
        if (!reducedMotion) output.write('\r\x1b[2K');
      },
    };
    spinner.start();
    ran = true;
    let result;
    try {
      result = await executeCommand(root, chosen, inputs, controller.signal);
    } finally {
      spinner.finish();
    }
    if (result.code === cancelledExitCode) throw new Cancelled();
    if (result.code === 0) clack.log.success('Complete', screen);
    else clack.log.error(`Command failed (exit ${result.code}). Review the result before retrying.`, screen);
    if (result.output) clack.log.message(result.output, screen);
    process.exitCode = result.code;
  } catch (error) {
    const cancelled = controller.signal.aborted || error instanceof Cancelled;
    if (cancelled) {
      if (ran) clack.outro('Interrupted. Review any effects before retrying.', screen);
      else clack.cancel('Cancelled. Command did not run.', screen);
      process.exitCode = cancelledExitCode;
    } else {
      const secrets = chosen ? secretInputs(chosen.definition).map(input => String(inputs[input.name] ?? '')) : [];
      clack.log.error(safeOutput(error instanceof Error ? error.message : 'Wizard failed.', secrets), screen);
      clack.outro('Check the command declaration and try again.', screen);
      process.exitCode = 1;
    }
  } finally {
    if (ran && chosen) {
      clack.outro('Raw command', screen);
      if (secretInputs(chosen.definition).length > 0) {
        output.write('Secret values are masked. Replace [hidden] before running.\n');
      }
      output.write(`${rawCommand(chosen, inputs)}\n`);
    }
    process.removeListener('SIGINT', cancel);
  }
}
