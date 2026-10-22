import { setTimeout as delay } from 'node:timers/promises';
import { Cancelled } from '../command.ts';
import type { Command, CommandContext } from '../command.ts';

// The interrupt precedes completion. Polls are shorter than key spacing, and stubborn work outlives the test deadline.
export const scheduledInterruptMs = 10;
export const simulatedCompletionMs = 50;
export const stubbornOperationMs = 60_000;
export const pollIntervalMs = 20;
export const keySpacingMs = 100;

async function waitForRecordedRead({ signal }: CommandContext): Promise<string> {
  signal.addEventListener('abort', () => {
    console.log('Signal aborted. Operation keeps waiting.');
  });

  console.log('Ready. This operation ignores the signal.');

  await delay(stubbornOperationMs);

  return 'must-not-complete';
}

export const fixtures = {
  cancel: {
    name: 'Cancel',
    help: 'Cancel.',
    inputs: [],
    run() {
      throw new Cancelled('Cancelled fixture');
    },
  },
  returnAfterAbort: {
    name: 'Interrupt',
    help: 'Interrupt.',
    interactive: true,
    inputs: [],
    async run(_inputs, { signal }) {
      setTimeout(() => process.kill(process.pid, 'SIGINT'), scheduledInterruptMs);

      await delay(simulatedCompletionMs);

      const cancelled = signal.aborted;

      if (!cancelled) throw new Error('Cancellation did not reach the command');

      return 'must-not-report-success';
    },
  },
  rawRead: {
    name: 'Read',
    help: 'Read.',
    inputs: [],
    async run() {
      console.error('raw-ready');

      await delay(stubbornOperationMs);

      return 'must-not-complete';
    },
  },
  stubborn: {
    name: 'Stubborn',
    help: 'Stubborn.',
    interactive: true,
    inputs: [],
    async run(_inputs, { signal }) {
      signal.addEventListener('abort', () => console.error('signal-aborted'));
      console.error('raw-ready');

      await delay(stubbornOperationMs);

      return 'must-not-complete';
    },
  },
  interact: {
    name: 'Interact',
    help: 'Interactive fixture.',
    interactive: true,
    inputs: [
      {
        name: 'TOKEN',
        prompt: 'Secret?',
        help: 'Fixture secret.',
        required: false,
        secret: true,
        kind: 'text',
      },
    ],
    run(inputs, { root, wizard, signal }) {
      const validContext = wizard && signal instanceof AbortSignal && root === process.argv.at(-1);

      if (!validContext) throw new Error('Interactive context missing');

      return 'Interactive result: ' + inputs.TOKEN;
    },
  },
  wait: {
    name: 'Wait',
    help: 'Wait.',
    interactive: true,
    inputs: [],
    async run(_inputs, { signal }) {
      console.log('interactive-ready');

      await new Promise<never>((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            process.stdin.pause();
            reject(new Cancelled());
          },
          { once: true },
        );

        process.stdin.resume();
      });

      return 'must-not-complete';
    },
  },
  finish: {
    name: 'Finish',
    help: 'Finish.',
    interactive: true,
    inputs: [],
    async run(_inputs, { signal }) {
      process.stdin.resume();
      console.log('interactive-ready');

      while (!signal.aborted) {
        await delay(pollIntervalMs);
      }

      process.stdin.pause();

      return 'must-not-show';
    },
  },
  generate: {
    name: 'Generate',
    help: 'Generate.',
    interactive: true,
    inputs: [],
    run(_inputs, { terminal }) {
      return terminal.withProgress(async () => {
        console.log('progress-ready');

        await delay(stubbornOperationMs);

        return 'must-not-complete';
      });
    },
  },
  json: {
    name: 'Generate',
    help: 'Generate.',
    interactive: true,
    inputs: [],
    async run(_inputs, { terminal, wizard }) {
      const rawContext = wizard === undefined;

      if (!rawContext) throw new Error('Raw context has a wizard flag');

      let calls = 0;

      return terminal.withProgress(async () => JSON.stringify({ calls: ++calls }));
    },
  },
  password: {
    name: 'Password',
    help: 'Password.',
    interactive: true,
    inputs: [],
    async run(_inputs, { terminal }) {
      await terminal.password('Private code', typed => (typed ? 'Rejected ' + typed : undefined));

      return 'must-not-run-after-cancel';
    },
  },
  progressSuccess: progressFixture('success'),
  progressFailure: progressFixture('failure'),
  progressCancel: progressFixture('cancel'),
  recordingRaw: {
    name: 'Read records',
    help: 'Fake read that ignores abort.',
    interactive: false,
    inputs: [],
    run(_inputs, context) {
      return waitForRecordedRead(context);
    },
  },
  recordingInteractive: {
    name: 'Read records',
    help: 'Fake read that ignores abort.',
    interactive: true,
    inputs: [],
    run(_inputs, context) {
      return context.terminal.withProgress(() => waitForRecordedRead(context));
    },
  },
} satisfies Record<string, Command>;

export type FixtureName = keyof typeof fixtures;

export type ProgressOutcome = 'success' | 'failure' | 'cancel';

function progressFixture(outcome: ProgressOutcome): Command {
  return {
    name: 'Progress',
    help: 'Progress.',
    interactive: true,
    inputs: [],
    async run(_inputs, { terminal, signal }) {
      await terminal.withProgress(async () => {
        console.log('progress-ready');

        const waitForCancel = outcome === 'cancel';

        if (waitForCancel) {
          await new Promise(resolve => {
            signal.addEventListener('abort', resolve, { once: true });
          });
        }

        const failOperation = outcome === 'failure';

        if (failOperation) throw new Error('fixture-failure');
      });

      return 'progress-finished';
    },
  };
}
