export const cancelledExitCode = 130;

export class Cancelled extends Error {
  constructor(message = 'Cancelled.', options?: ErrorOptions) {
    super(message, options);
  }
}

export type Interruption = ReturnType<typeof createInterruption>;

export function createInterruption() {
  const controller = new AbortController();
  const { signal } = controller;
  const cleanups = new Set<() => void>();
  const wasRaw = process.stdin.isRaw;
  const wasFlowing = process.stdin.readableFlowing;
  let childCleanupOwnsExit = false;

  function dispose() {
    for (const cleanup of cleanups) cleanup();

    cleanups.clear();

    if (process.stdin.isTTY) process.stdin.setRawMode(wasRaw ?? false);
    if (wasFlowing === true) process.stdin.resume();
    else process.stdin.pause();
  }

  function interrupt() {
    // Child commands keep their process-group cleanup; in-process commands need an escape from ignored aborts.
    const forceExit = signal.aborted && !childCleanupOwnsExit;

    if (forceExit) {
      dispose();

      if (process.stdout.isTTY) process.stdout.write('\r\x1b[2K\x1b[?25h');

      process.stderr.write('Stopped. Review any effects before retrying.\n');
      process.exit(cancelledExitCode);
    }

    controller.abort();
  }

  function onCleanup(cleanup: () => void) {
    cleanups.add(cleanup);

    return () => cleanups.delete(cleanup);
  }

  async function runInProcess<T>(operation: () => T | Promise<T>): Promise<T> {
    const alreadyCancelled = signal.aborted;

    if (alreadyCancelled) throw new Cancelled();

    let outcome: T;

    try {
      outcome = await operation();
    } catch (error) {
      const interruptedFailure = signal.aborted && !(error instanceof Cancelled);

      if (interruptedFailure) throw new Cancelled(undefined, { cause: error });

      throw error;
    }

    const cancelled = signal.aborted;

    if (cancelled) throw new Cancelled();

    return outcome;
  }

  async function runChild<T>(operation: () => Promise<T>): Promise<T> {
    childCleanupOwnsExit = true;

    try {
      return await operation();
    } finally {
      childCleanupOwnsExit = false;
    }
  }

  return { signal, interrupt, runInProcess, runChild, onCleanup, dispose };
}
