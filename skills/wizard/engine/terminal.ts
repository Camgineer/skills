import * as clack from '@clack/prompts';
import { Writable } from 'node:stream';
import { Cancelled } from './interruption.ts';
import type { Interruption } from './interruption.ts';

// Keep only a few choices visible; Clack scrolls the remaining entries.
const menuItems = 4;
// A slow cadence keeps progress legible without animating keyboard interactions.
const spinnerFrameMs = 120;

// ANSI 256-color accents are opt-in; the default uses the terminal's own palette.
const softAccents = {
  light: { current: 97, success: 65, warning: 136 },
  dark: { current: 183, success: 150, warning: 223 },
};

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

export type Validate = (value: string | undefined) => string | undefined;

export function createTerminal(interruption: Interruption) {
  const output = new TerminalOutput();
  const screen = { output };
  const prompts = { output, signal: interruption.signal };

  function showStep(title: string) {
    if (!enabled(process.env.ACCESSIBLE)) output.write('\x1b[2J\x1b[H');
    clack.intro(title, screen);
  }

  async function answer<T>(promise: Promise<T>): Promise<Exclude<T, typeof clack.CANCEL_SYMBOL>> {
    const response = await promise;
    const cancelledByKey = clack.isCancel(response) && !interruption.signal.aborted;

    if (cancelledByKey) interruption.interrupt();

    const cancelled = interruption.signal.aborted;

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
    const { signal } = interruption;

    const alreadyCancelled = signal.aborted;

    if (alreadyCancelled) throw new Cancelled();

    const visible = process.stdout.isTTY;
    const keyboard = visible && process.stdin.isTTY;
    const reducedMotion = enabled(process.env.WIZARD_REDUCED_MOTION);
    const animated = visible && !reducedMotion;
    const staticIndicator = visible && reducedMotion;
    const wasRaw = process.stdin.isRaw;
    const wasFlowing = process.stdin.readableFlowing;
    const frames = ['◒', '◐', '◓', '◑'];
    let frame = 0;
    let spinnerTimer: NodeJS.Timeout | undefined;

    function readCancelKeys(chunk: Buffer | string) {
      const keys = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;

      for (const key of keys) {
        const cancelKey = key === '\x03' || key === '\x1b' && keys.length === 1;

        if (cancelKey) interruption.interrupt();
      }
    }

    function stopIndicator() {
      clearInterval(spinnerTimer);

      if (animated) output.write('\r\x1b[2K');
    }

    function finish() {
      stopIndicator();
      signal.removeEventListener('abort', stopIndicator);

      if (keyboard) {
        process.stdin.removeListener('data', readCancelKeys);
        process.stdin.setRawMode(wasRaw ?? false);

        const restorePausedInput = wasFlowing !== true;

        if (restorePausedInput) process.stdin.pause();
      }
    }

    const removeCleanup = interruption.onCleanup(finish);

    try {
      // Raw mode keeps Make alive for cleanup and catches repeated Ctrl-C keys after abort.
      if (keyboard) {
        process.stdin.setRawMode(true);
        process.stdin.on('data', readCancelKeys);
        process.stdin.resume();
      }

      if (staticIndicator) clack.log.step('Running', screen);

      if (animated) {
        const draw = () => {
          output.write(`\r\x1b[2K\x1b[35m${frames[frame]}\x1b[39m  Running`);
          frame = (frame + 1) % frames.length;
        };

        draw();
        spinnerTimer = setInterval(draw, spinnerFrameMs);
      }

      signal.addEventListener('abort', stopIndicator, { once: true });

      const outcome = await operation();

      const cancelled = signal.aborted;

      if (cancelled) throw new Cancelled();

      return outcome;
    } finally {
      finish();
      removeCleanup();
    }
  }

  function text(message: string, validate?: Validate) {
    return answer(clack.text({ ...prompts, message, validate }));
  }

  function password(message: string, validate?: Validate) {
    const hiddenValidation: Validate = value => {
      const explanation = validate?.(value);
      const hasSecret = value !== undefined && value.length > 0;

      return hasSecret ? explanation?.replaceAll(value, '[hidden]') : explanation;
    };

    return answer(clack.password({ ...prompts, message, validate: hiddenValidation }));
  }

  function confirm(message: string, options: { initialValue: boolean }) {
    return answer(clack.confirm({ ...prompts, message, initialValue: options.initialValue }));
  }

  function info(message: string) {
    clack.log.info(message, screen);
  }

  return {
    output,
    screen,
    prompts,
    showStep,
    answer,
    select,
    showHelp,
    withProgress,
    text,
    password,
    confirm,
    info,
  };
}

export type Terminal = ReturnType<typeof createTerminal>;
