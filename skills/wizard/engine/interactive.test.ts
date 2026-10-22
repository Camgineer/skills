import { test } from 'node:test';
import assert from 'node:assert/strict';
import pty from '@lydell/node-pty';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { validateDefinition } from './command.ts';

const skillRoot = fileURLToPath(new URL('../', import.meta.url));
const engine = fileURLToPath(new URL('./command.ts', import.meta.url));
const cli = fileURLToPath(new URL('./cli.ts', import.meta.url));
// Generous enough for a loaded CI machine, far shorter than the operations the fixtures leave waiting.
const deadlineMs = 10_000;
const posixOnly = { skip: process.platform === 'win32' };

async function waitFor(ready: () => boolean, failure: () => string) {
  const deadline = Date.now() + deadlineMs;

  while (!ready()) {
    const expired = Date.now() > deadline;

    if (expired) throw new Error(failure());

    await delay(20);
  }
}

function withinDeadline<T>(outcome: Promise<T>, failure: () => string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(failure())), deadlineMs);
  });

  return Promise.race([outcome, expired]).finally(() => clearTimeout(timeout));
}

async function withCommand(path: string, declaration: string, check: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(skillRoot, '.test-'));

  try {
    const folder = join(root, 'scripts', path);
    await mkdir(folder, { recursive: true });
    await writeFile(join(root, 'package.json'), '{"type":"module"}');
    await writeFile(join(folder, 'run.ts'), 'throw new Error("Must not spawn the raw entrypoint");');
    await writeFile(join(folder, 'command.ts'), declaration);

    await check(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function openWizard(root: string, path: string, shell = '') {
  const wizardCommand = `${JSON.stringify(process.execPath)} ${JSON.stringify(cli)} wizard ${path} --root ${JSON.stringify(root)}`;
  const terminal = pty.spawn('/bin/sh', ['-c', shell ? shell.replace('WIZARD', wizardCommand) : wizardCommand], {
    cwd: root,
    name: 'xterm-256color',
    cols: 100,
    rows: 30,
    env: { ...process.env, ACCESSIBLE: '1', NO_COLOR: '1' },
  });

  let transcript = '';
  terminal.onData((chunk) => {
    transcript += chunk;
  });

  const exited = new Promise<number>((resolve) => terminal.onExit((event) => resolve(event.exitCode)));

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

function runRaw(source: string) {
  const child = spawn(process.execPath, ['--input-type=module', '-e', source], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const closed = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.once('close', (code, signal) => resolve({ code, signal }));
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
    const declaration = { name: 'Fixture', help: 'Fixture.', inputs: [], interactive, run: () => '' };

    assert.throws(() => validateDefinition(declaration), /interactive must be a boolean/);
  }
  validateDefinition({ name: 'Fixture', help: 'Fixture.', inputs: [], interactive: true, run: () => '' });
});

test('raw cancellation errors exit 130 instead of reporting a failed command', () => {
  const run = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { runCommand, Cancelled } from ${JSON.stringify(engine)};
    await runCommand({ name: 'Cancel', help: 'Cancel.', inputs: [], run() { throw new Cancelled('Cancelled fixture'); } });
  `,
    ],
    { encoding: 'utf8' },
  );

  assert.equal(run.status, 130);
  assert.match(run.stderr, /Cancelled fixture/);
});

test('raw Ctrl-C cannot report success when interrupted work returns normally', () => {
  const run = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { runCommand } from ${JSON.stringify(engine)};
    await runCommand({ name: 'Interrupt', help: 'Interrupt.', interactive: true, inputs: [],
      async run(_inputs, { signal }) {
        setTimeout(() => process.kill(process.pid, 'SIGINT'), 10);
        await new Promise(resolve => setTimeout(resolve, 50));
        if (!signal.aborted) throw new Error('Cancellation did not reach the command');
        return 'must-not-report-success';
      },
    });
  `,
    ],
    { encoding: 'utf8' },
  );

  assert.equal(run.status, 130, run.stderr);
  assert.equal(run.stdout, '');
  assert.match(run.stderr, /Cancelled/);
});

test('one Ctrl-C stops a raw noninteractive command that ignores its signal', posixOnly, async () => {
  const raw = runRaw(`
    import { runCommand } from ${JSON.stringify(engine)};
    await runCommand({ name: 'Read', help: 'Read.', inputs: [],
      async run() {
        console.error('raw-ready');
        await new Promise(resolve => setTimeout(resolve, 60_000));
        return 'must-not-complete';
      },
    });
  `);
  try {
    await raw.waitFor('raw-ready');
    raw.child.kill('SIGINT');
    const { code, signal } = await raw.closed();

    assert.ok(signal === 'SIGINT' || code === 130, `exit ${code} ${signal}`);
    assert.equal(raw.stdout(), '');
  } finally {
    await raw.stop();
  }
});

test('a second Ctrl-C stops a raw interactive command that keeps waiting after abort', posixOnly, async () => {
  const raw = runRaw(`
    import { runCommand } from ${JSON.stringify(engine)};
    await runCommand({ name: 'Stubborn', help: 'Stubborn.', interactive: true, inputs: [],
      async run(_inputs, { signal }) {
        signal.addEventListener('abort', () => console.error('signal-aborted'));
        console.error('raw-ready');
        await new Promise(resolve => setTimeout(resolve, 60_000));
        return 'must-not-complete';
      },
    });
  `);
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
});

test(
  'interactive wizard runs in process, passes its abort signal, and redacts its returned result',
  posixOnly,
  async () => {
    await withCommand(
      'interact',
      `export const definition = {
    name: 'Interact', help: 'Interactive fixture.', interactive: true,
    inputs: [{ name: 'TOKEN', prompt: 'Secret?', help: 'Fixture secret.', required: false, secret: true, kind: 'text' }],
    run(inputs, { root, wizard, signal }) {
      if (!wizard || !(signal instanceof AbortSignal) || root !== process.argv.at(-1)) throw new Error('Interactive context missing');
      return 'Interactive result: ' + inputs.TOKEN;
    },
  };`,
      async (root) => {
        const wizard = openWizard(root, 'interact');
        try {
          await wizard.waitFor('Secret?');
          wizard.terminal.write('private-interactive-value\r');
          const code = await wizard.exited();

          assert.equal(code, 0, wizard.transcript());
          assert.match(wizard.transcript(), /Interactive result: \[hidden\]/);
          assert.doesNotMatch(wizard.transcript(), /private-interactive-value|Must not spawn|context missing/);
        } finally {
          wizard.terminal.kill('SIGKILL');
        }
      },
    );
  },
);

test('interactive wizard abort signal stops an in-process operation on Ctrl-C', posixOnly, async () => {
  await withCommand(
    'wait',
    `
    import { Cancelled } from ${JSON.stringify(engine)};
    export const definition = { name: 'Wait', help: 'Wait.', interactive: true, inputs: [],
      async run(_inputs, { signal }) {
        console.log('interactive-ready');
        await new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => { process.stdin.pause(); reject(new Cancelled()); }, { once: true });
          process.stdin.resume();
        });
        return 'must-not-complete';
      },
    };
  `,
    async (root) => {
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
    },
  );
});

test('interactive wizard discards a result returned after Ctrl-C', posixOnly, async () => {
  await withCommand(
    'finish',
    `export const definition = {
    name: 'Finish', help: 'Finish.', interactive: true, inputs: [],
    async run(_inputs, { signal }) {
      process.stdin.resume();
      console.log('interactive-ready');
      while (!signal.aborted) await new Promise(resolve => setTimeout(resolve, 10));
      process.stdin.pause();
      return 'must-not-show';
    },
  };`,
    async (root) => {
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
    },
  );
});

test('two Ctrl-C keys stop progress that ignores abort and restore the terminal mode', posixOnly, async () => {
  await withCommand(
    'generate',
    `export const definition = {
    name: 'Generate', help: 'Generate.', interactive: true, inputs: [],
    run(_inputs, { terminal }) {
      return terminal.withProgress(async () => {
        console.log('progress-ready');
        await new Promise(resolve => setTimeout(resolve, 60_000));
        return 'must-not-complete';
      });
    },
  };`,
    async (root) => {
      const wizard = openWizard(root, 'generate', 'WIZARD; echo "wizard-exit=$?"; stty -a');
      try {
        await wizard.waitFor('progress-ready');
        wizard.terminal.write('\x03');
        await delay(100);
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
    },
  );
});

test('piped interactive progress preserves JSON stdout and calls its operation once', () => {
  const run = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { runCommand } from ${JSON.stringify(engine)};
    await runCommand({ name: 'Generate', help: 'Generate.', interactive: true, inputs: [],
      async run(_inputs, { terminal, wizard }) {
        if (wizard !== undefined) throw new Error('Raw context has a wizard flag');
        let calls = 0;
        return terminal.withProgress(async () => JSON.stringify({ calls: ++calls }));
      },
    });
  `,
    ],
    { encoding: 'utf8' },
  );

  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, '{"calls":1}\n');
  assert.equal(run.stderr, '');
});

test(
  'command password validation hides the secret and cancellation never reaches command code',
  posixOnly,
  async () => {
    await withCommand(
      'password',
      `export const definition = {
    name: 'Password', help: 'Password.', interactive: true, inputs: [],
    async run(_inputs, { terminal }) {
      await terminal.password('Private code', typed => typed ? 'Rejected ' + typed : undefined);
      return 'must-not-run-after-cancel';
    },
  };`,
      async (root) => {
        const wizard = openWizard(root, 'password');

        try {
          await wizard.waitFor('Private code');
          wizard.terminal.write('private-code\r');
          await wizard.waitFor('Rejected');
          wizard.terminal.write('\x03');
          const code = await wizard.exited();

          assert.equal(code, 130, wizard.transcript());
          assert.doesNotMatch(wizard.transcript(), /private-code|must-not-run-after-cancel|trim is not a function/);
        } finally {
          wizard.terminal.kill('SIGKILL');
        }
      },
    );
  },
);

for (const outcome of ['success', 'failure', 'cancel'] as const) {
  test(`progress restores terminal mode and stops drawing after ${outcome}`, posixOnly, async () => {
    await withCommand(
      'progress',
      `export const definition = {
      name: 'Progress', help: 'Progress.', interactive: true, inputs: [],
      async run(_inputs, { terminal, signal }) {
        await terminal.withProgress(async () => {
          console.log('progress-ready');
          if (${JSON.stringify(outcome)} === 'cancel') {
            await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
          }
          if (${JSON.stringify(outcome)} === 'failure') throw new Error('fixture-failure');
        });
        return 'progress-finished';
      },
    };`,
      async (root) => {
        const wizard = openWizard(root, 'progress', 'WIZARD; echo "wizard-exit=$?"; stty -a');

        try {
          await wizard.waitFor('progress-ready');

          if (outcome === 'cancel') wizard.terminal.write('\x03');

          await wizard.exited();
          const transcript = wizard.transcript();
          const expectedCode = outcome === 'success' ? 0 : outcome === 'cancel' ? 130 : 1;
          const settings = transcript.slice(transcript.indexOf('wizard-exit='));

          assert.match(settings, new RegExp(`wizard-exit=${expectedCode}`), transcript);
          assert.match(settings, /(?<!-)icanon/, settings);
          assert.match(settings, /(?<!-)isig/, settings);
          assert.match(settings, /(?<!-)echo /, settings);
          assert.doesNotMatch(settings, /Running/);

          if (outcome !== 'success') assert.doesNotMatch(transcript, /progress-finished|Complete/);
        } finally {
          wizard.terminal.kill('SIGKILL');
        }
      },
    );
  });
}
