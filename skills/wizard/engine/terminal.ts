import * as clack from '@clack/prompts';
import { Writable } from 'node:stream';

// Keep only a few choices visible; Clack scrolls the remaining entries.
const menuItems = 4;
// A slow cadence keeps progress legible without animating keyboard interactions.
const spinnerFrameMs = 120;

// ANSI 256-color accents are opt-in; the default uses the terminal's own palette.
const softAccents = {
  light: { current: 97, success: 65, warning: 136 },
  dark: { current: 183, success: 150, warning: 223 },
};

export class Cancelled extends Error {}

function enabled(setting: string | undefined): boolean {
  return setting !== undefined && setting !== '' && setting !== '0' && setting !== 'false';
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

export function createTerminal(controller: AbortController) {
  const output = new TerminalOutput();
  const screen = { output };
  const prompts = { output, signal: controller.signal };

  function showStep(title: string) {
    if (!enabled(process.env.ACCESSIBLE)) output.write('\x1b[2J\x1b[H');
    clack.intro(title, screen);
  }

  async function answer<T>(promise: Promise<T>): Promise<Exclude<T, typeof clack.CANCEL_SYMBOL>> {
    const response = await promise;
    const cancelled = clack.isCancel(response) || controller.signal.aborted;
    if (cancelled) throw new Cancelled();
    return response as Exclude<T, typeof clack.CANCEL_SYMBOL>;
  }

  function select<Value>(message: string, options: clack.Option<Value>[], initialValue?: Value) {
    return answer(clack.select({
      ...prompts,
      message: `${message}\n↑↓ / Enter`,
      options,
      initialValue,
      maxItems: menuItems,
      showInstructions: false,
    }));
  }

  async function showHelp(help: string) {
    clack.log.info(help, screen);
    const resume = await answer(clack.confirm({ ...prompts, message: 'Return to this input?', initialValue: true }));
    if (!resume) throw new Cancelled();
  }

  async function withProgress<T>(operation: () => Promise<T>): Promise<T> {
    let spinnerTimer: NodeJS.Timeout | undefined;
    const frames = ['◒', '◐', '◓', '◑'];
    let frame = 0;
    const reducedMotion = enabled(process.env.WIZARD_REDUCED_MOTION);
    const wasRaw = process.stdin.isRaw;
    const wasFlowing = process.stdin.readableFlowing;
    const cancelKey = (chunk: Buffer | string) => {
      const keys = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
      if (keys.includes('\x03') || keys === '\x1b') controller.abort();
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
    try {
      spinner.start();
      return await operation();
    } finally {
      spinner.finish();
    }
  }

  return { output, screen, prompts, showStep, answer, select, showHelp, withProgress };
}

export type Terminal = ReturnType<typeof createTerminal>;
