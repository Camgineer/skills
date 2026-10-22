import { test } from 'node:test';
import assert from 'node:assert/strict';
import pty from '@lydell/node-pty';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { validateDefinition } from './command.ts';
import type { Command } from './command.ts';
import { keySpacingMs, pollIntervalMs } from './fixtures/interactive.ts';
import type { FixtureName, ProgressOutcome } from './fixtures/interactive.ts';

const skillRoot = fileURLToPath(new URL('../', import.meta.url));
const fixtureModule = fileURLToPath(new URL('./fixtures/interactive.ts', import.meta.url));
const fixtureRunner = fileURLToPath(new URL('./fixtures/run-interactive.ts', import.meta.url));
const cli = fileURLToPath(new URL('./cli.ts', import.meta.url));
// Generous enough for a loaded CI machine, far shorter than the operations the fixtures leave waiting.
const deadlineMs = 10_000;
const posixOnly = { skip: process.platform === 'win32' };

async function waitFor(ready: () => boolean, failure: () => string) {
  const deadline = Date.now() + deadlineMs;

  while (!ready()) {
    const expired = Date.now() > deadline;

    if (expired) throw new Error(failure());

    await delay(pollIntervalMs);
  }
}

function withinDeadline<T>(outcome: Promise<T>, failure: () => string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(failure())), deadlineMs);
  });

  return Promise.race([outcome, expired]).finally(() => clearTimeout(timeout));
}

async function withCommand(
  path: string,
  fixtureName: FixtureName,
  check: (root: string) => Promise<void>,
) {
  const root = await mkdtemp(join(skillRoot, '.test-'));

  try {
    const folder = join(root, 'scripts', path);
    const declaration = [
      `import { fixtures } from ${JSON.stringify(fixtureModule)};`,
      `export const definition = fixtures[${JSON.stringify(fixtureName)}];`,
    ].join('\n');

    await mkdir(folder, { recursive: true });
    await writeFile(join(root, 'package.json'), '{"type":"module"}');
    await writeFile(
      join(folder, 'run.ts'),
      'throw new Error("Must not spawn the raw entrypoint");',
    );
    await writeFile(join(folder, 'command.ts'), declaration);

    await check(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function openWizard(root: string, path: string, shell = '') {
  const wizardCommand = `${JSON.stringify(process.execPath)} ${JSON.stringify(cli)} wizard ${path} --root ${JSON.stringify(root)}`;
  const shellCommand = shell ? shell.replace('WIZARD', wizardCommand) : wizardCommand;
  const terminal = pty.spawn('/bin/sh', ['-c', shellCommand], {
    cwd: root,
    name: 'xterm-256color',
    cols: 100,
    rows: 30,
    env: { ...process.env, ACCESSIBLE: '1', NO_COLOR: '1' },
  });

  let transcript = '';

  terminal.onData(chunk => {
    transcript += chunk;
  });

  const exited = new Promise<number>(resolve => {
    terminal.onExit(event => resolve(event.exitCode));
  });

  return {
    terminal,
    transcript: () => transcript,
    exited: () => withinDeadline(exited, () => `Wizard did not exit: ${transcript}`),
    waitFor: (text: string) =>
      waitFor(
        () => transcript.includes(text),
        () => `Missing ${text}: ${transcript}`,
      ),
  };
}

function runRawSync(fixtureName: FixtureName) {
  return spawnSync(process.execPath, [fixtureRunner, fixtureName], { encoding: 'utf8' });
}

function runRaw(fixtureName: FixtureName) {
  const child = spawn(process.execPath, [fixtureRunner, fixtureName], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', chunk => {
    stdout += chunk;
  });
  child.stderr.on('data', chunk => {
    stderr += chunk;
  });

  const closed = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(resolve => {
    child.once('close', (code, signal) => {
      resolve({ code, signal });
    });
  });

  return {
    child,
    stdout: () => stdout,
    stderr: () => stderr,
    closed: () => withinDeadline(closed, () => `Raw command did not exit: ${stderr}`),
    stop: async () => {
      child.kill('SIGKILL');

      await closed;
    },
    waitFor: (text: string) =>
      waitFor(
        () => stderr.includes(text),
        () => `Missing ${text}: ${stderr}`,
      ),
  };
}

test('interactive declarations reject non-boolean values before commands can execute', () => {
  for (const interactive of ['true', 1, null]) {
    const declaration = {
      name: 'Fixture',
      help: 'Fixture.',
      inputs: [],
      interactive,
      run: () => '',
    };

    assert.throws(() => validateDefinition(declaration), /interactive must be a boolean/);
  }

  const accepted: Command = {
    name: 'Fixture',
    help: 'Fixture.',
    inputs: [],
    interactive: true,
    run: () => '',
  };

  validateDefinition(accepted);
});

test('raw cancellation errors exit 130 instead of reporting a failed command', () => {
  const run = runRawSync('cancel');

  assert.equal(run.status, 130);
  assert.match(run.stderr, /Cancelled fixture/);
});

test('raw Ctrl-C cannot report success when interrupted work returns normally', () => {
  const run = runRawSync('returnAfterAbort');

  assert.equal(run.status, 130, run.stderr);
  assert.equal(run.stdout, '');
  assert.match(run.stderr, /Cancelled/);
});

test(
  'one Ctrl-C stops a raw noninteractive command that ignores its signal',
  posixOnly,
  async () => {
    const raw = runRaw('rawRead');

    try {
      await raw.waitFor('raw-ready');
      raw.child.kill('SIGINT');
      const { code, signal } = await raw.closed();

      assert.ok(signal === 'SIGINT' || code === 130, `exit ${code} ${signal}`);
      assert.equal(raw.stdout(), '');
    } finally {
      await raw.stop();
    }
  },
);

test(
  'a second Ctrl-C stops a raw interactive command that keeps waiting after abort',
  posixOnly,
  async () => {
    const raw = runRaw('stubborn');

    try {
      await raw.waitFor('raw-ready');
      raw.child.kill('SIGINT');
      await raw.waitFor('signal-aborted');
      raw.child.kill('SIGINT');
      const { code } = await raw.closed();

      assert.equal(code, 130, raw.stderr());
      assert.equal(raw.stdout(), '');
    } finally {
      await raw.stop();
    }
  },
);

test(
  'interactive wizard runs in process, passes its abort signal, and redacts its returned result',
  posixOnly,
  async () => {
    await withCommand('interact', 'interact', async root => {
      const wizard = openWizard(root, 'interact');

      try {
        await wizard.waitFor('Secret?');
        wizard.terminal.write('private-interactive-value\r');
        const code = await wizard.exited();

        assert.equal(code, 0, wizard.transcript());
        assert.match(wizard.transcript(), /Interactive result: \[hidden\]/);
        assert.doesNotMatch(
          wizard.transcript(),
          /private-interactive-value|Must not spawn|context missing/,
        );
      } finally {
        wizard.terminal.kill('SIGKILL');
      }
    });
  },
);

test(
  'interactive wizard abort signal stops an in-process operation on Ctrl-C',
  posixOnly,
  async () => {
    await withCommand('wait', 'wait', async root => {
      const wizard = openWizard(root, 'wait');

      try {
        await wizard.waitFor('interactive-ready');
        wizard.terminal.write('\x03');
        const code = await wizard.exited();

        assert.equal(code, 130, wizard.transcript());
        assert.doesNotMatch(wizard.transcript(), /must-not-complete/);
      } finally {
        wizard.terminal.kill('SIGKILL');
      }
    });
  },
);

test('interactive wizard discards a result returned after Ctrl-C', posixOnly, async () => {
  await withCommand('finish', 'finish', async root => {
    const wizard = openWizard(root, 'finish');

    try {
      await wizard.waitFor('interactive-ready');
      wizard.terminal.write('\x03');
      const code = await wizard.exited();

      assert.equal(code, 130, wizard.transcript());
      assert.match(wizard.transcript(), /Interrupted/);
      assert.doesNotMatch(wizard.transcript(), /must-not-show|Complete/);
    } finally {
      wizard.terminal.kill('SIGKILL');
    }
  });
});

test(
  'two Ctrl-C keys stop progress that ignores abort and restore the terminal mode',
  posixOnly,
  async () => {
    await withCommand('generate', 'generate', async root => {
      const wizard = openWizard(root, 'generate', 'WIZARD; echo "wizard-exit=$?"; stty -a');

      try {
        await wizard.waitFor('progress-ready');
        wizard.terminal.write('\x03');
        await delay(keySpacingMs);
        wizard.terminal.write('\x03');
        await wizard.exited();

        const transcript = wizard.transcript();

        assert.match(transcript, /wizard-exit=130/, transcript);
        assert.doesNotMatch(transcript, /must-not-complete|Complete/);

        const settings = transcript.slice(transcript.indexOf('wizard-exit='));

        assert.match(settings, /(?<!-)icanon/, settings);
        assert.match(settings, /(?<!-)isig/, settings);
        assert.match(settings, /(?<!-)echo /, settings);
      } finally {
        wizard.terminal.kill('SIGKILL');
      }
    });
  },
);

test('piped interactive progress preserves JSON stdout and calls its operation once', () => {
  const run = runRawSync('json');

  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, '{"calls":1}\n');
  assert.equal(run.stderr, '');
});

test(
  'command password validation hides the secret and cancellation never reaches command code',
  posixOnly,
  async () => {
    await withCommand('password', 'password', async root => {
      const wizard = openWizard(root, 'password');

      try {
        await wizard.waitFor('Private code');
        wizard.terminal.write('private-code\r');
        await wizard.waitFor('Rejected');
        wizard.terminal.write('\x03');
        const code = await wizard.exited();

        assert.equal(code, 130, wizard.transcript());
        assert.doesNotMatch(
          wizard.transcript(),
          /private-code|must-not-run-after-cancel|trim is not a function/,
        );
      } finally {
        wizard.terminal.kill('SIGKILL');
      }
    });
  },
);

const progressFixtures = {
  success: 'progressSuccess',
  failure: 'progressFailure',
  cancel: 'progressCancel',
} satisfies Record<ProgressOutcome, FixtureName>;

const progressExitCodes = {
  success: 0,
  failure: 1,
  cancel: 130,
} satisfies Record<ProgressOutcome, number>;

for (const outcome of ['success', 'failure', 'cancel'] as const) {
  test(
    `progress restores terminal mode and stops drawing after ${outcome}`,
    posixOnly,
    async () => {
      await withCommand('progress', progressFixtures[outcome], async root => {
        const wizard = openWizard(root, 'progress', 'WIZARD; echo "wizard-exit=$?"; stty -a');

        try {
          await wizard.waitFor('progress-ready');

          const cancelling = outcome === 'cancel';

          if (cancelling) wizard.terminal.write('\x03');

          await wizard.exited();

          const transcript = wizard.transcript();
          const expectedCode = progressExitCodes[outcome];

          const settings = transcript.slice(transcript.indexOf('wizard-exit='));

          assert.match(settings, new RegExp(`wizard-exit=${expectedCode}`), transcript);
          assert.match(settings, /(?<!-)icanon/, settings);
          assert.match(settings, /(?<!-)isig/, settings);
          assert.match(settings, /(?<!-)echo /, settings);
          assert.doesNotMatch(settings, /Running/);

          const failedOrCancelled = outcome !== 'success';

          if (failedOrCancelled) assert.doesNotMatch(transcript, /progress-finished|Complete/);
        } finally {
          wizard.terminal.kill('SIGKILL');
        }
      });
    },
  );
}
