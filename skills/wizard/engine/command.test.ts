import { test } from 'node:test';
import pty from '@lydell/node-pty';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { checkCommands, discoverCommands } from './discovery.ts';
import { executeCommand, rawCommand } from './execution.ts';

const skillRoot = fileURLToPath(new URL('../', import.meta.url));
const exampleRoot = join(skillRoot, 'example');
const engine = fileURLToPath(new URL('./command.ts', import.meta.url));

function make(...args: string[]) {
  return spawnSync('make', ['--no-print-directory', ...args], { cwd: exampleRoot, encoding: 'utf8' });
}

test('nested raw targets always run and irreversible actions require explicit confirmation', () => {
  const denied = make('workspace/cache/clear');
  assert.notEqual(denied.status, 0);
  assert.match(denied.stderr, /CONFIRM=true/);
  const allowed = make('workspace/cache/clear', 'CONFIRM=true');
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.match(allowed.stdout, /cache cleared/);
  const greeting = make('greet', 'NAME=left=right', 'COUNT=2', 'LOUD=true', 'TONE=formal');
  assert.equal(greeting.status, 0, greeting.stderr);
  assert.equal(greeting.stdout, 'GOOD DAY, LEFT=RIGHT!\nGOOD DAY, LEFT=RIGHT!\n');
});

test('wizard and copyable raw command preserve shell and make metacharacters without execution', async () => {
  const commands = await discoverCommands(exampleRoot);
  const command = commands.find(command => command.path === 'greet')!;
  const name = "one=two ' $HOME $(shell echo bad) `echo bad` \\ end";
  const inputs = { NAME: name, COUNT: 1, TONE: 'friendly', LOUD: false, TOKEN: '' };
  const run = await executeCommand(exampleRoot, command, inputs, new AbortController().signal);
  assert.equal(run.code, 0, run.output);
  assert.equal(run.output, `Hello, ${name}!`);
  const replay = rawCommand(command, inputs);
  const raw = spawnSync('/bin/sh', ['-c', replay], { cwd: exampleRoot, encoding: 'utf8' });
  assert.equal(raw.status, 0, raw.stderr);
  assert.equal(raw.stdout.trimEnd(), run.output);
});

test('command checking rejects missing declarations, invalid defaults, unsafe names, and skill collisions', async () => {
  const root = await mkdtemp(join(skillRoot, '.test-'));
  const definition = (inputs: string) => `import type { Command } from ${JSON.stringify(engine)};\nexport const definition = { name: 'Fixture', help: 'Fixture help.', inputs: ${inputs}, run: () => 'ok' } satisfies Command;`;
  const input = { name: 'MODE', prompt: 'Mode?', help: 'Choose a mode.', required: true, secret: false, kind: 'choice', options: [{ value: 'one', label: 'One' }], default: 'missing' };
  try {
    await mkdir(join(root, 'scripts', 'broken'), { recursive: true });
    await writeFile(join(root, 'scripts', 'broken', 'run.ts'), '');
    await assert.rejects(discoverCommands(root), /both command.ts and run.ts/);
    await writeFile(join(root, 'scripts', 'broken', 'command.ts'), definition(JSON.stringify([input])));
    await assert.rejects(discoverCommands(root), /declared choices/);
    await rm(join(root, 'scripts'), { recursive: true });
    for (const path of ['a/b-c', 'a-b/c']) {
      const folder = join(root, 'scripts', path);
      await mkdir(folder, { recursive: true });
      await writeFile(join(folder, 'run.ts'), '');
      await writeFile(join(folder, 'command.ts'), definition('[]'));
    }
    await assert.rejects(discoverCommands(root), /collides/);
    await rm(join(root, 'scripts'), { recursive: true });
    const folder = join(root, 'scripts', 'unsafe');
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, 'run.ts'), '');
    await writeFile(join(folder, 'command.ts'), definition(JSON.stringify([{ ...input, name: 'SHELL' }])));
    await assert.rejects(discoverCommands(root), /safe uppercase name/);
    await rm(join(root, 'scripts'), { recursive: true });
    await mkdir(join(root, 'scripts', 'check-commands'), { recursive: true });
    await writeFile(join(root, 'scripts', 'check-commands', 'run.ts'), '');
    await writeFile(join(root, 'scripts', 'check-commands', 'command.ts'), definition('[]'));
    await assert.rejects(discoverCommands(root), /reserved/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('secrets stay hidden in results and replay, and cancellation stops the process group', async () => {
  const command = (await discoverCommands(exampleRoot)).find(command => command.path === 'greet')!;
  const inputs = { NAME: 'World', COUNT: 1, TONE: 'friendly', LOUD: false, TOKEN: 'private-test-value' };
  const run = await executeCommand(exampleRoot, command, inputs, new AbortController().signal);
  assert.equal(run.code, 0, run.output);
  assert.match(run.output, /Private note: \[hidden\]/);
  assert.ok(!rawCommand(command, inputs).includes(inputs.TOKEN));
  assert.match(rawCommand(command, { ...inputs, NAME: inputs.TOKEN }), /'NAME=private-test-value'/);
  const defaultSecret = 'private-default-value';
  const defaultRunner = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { runCommand } from ${JSON.stringify(engine)};
    await runCommand({ name: 'Default', help: 'Default.', inputs: [{
      name: 'TOKEN', prompt: 'Secret?', help: 'Secret.', required: false, secret: true,
      kind: 'text', default: ${JSON.stringify(defaultSecret)},
    }], run: inputs => String(inputs.TOKEN) });
  `], { encoding: 'utf8', env: { ...process.env, TOKEN: '' } });
  assert.equal(defaultRunner.status, 0, defaultRunner.stderr);
  assert.equal(defaultRunner.stdout.trimEnd(), '[hidden]');
  const numericRunner = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { runCommand } from ${JSON.stringify(engine)};
    await runCommand({ name: 'Number', help: 'Number.', inputs: [{
      name: 'PIN', prompt: 'PIN?', help: 'PIN.', required: true, secret: true, kind: 'number',
    }], run: inputs => String(inputs.PIN) });
  `], { encoding: 'utf8', env: { ...process.env, PIN: '001234' } });
  assert.equal(numericRunner.status, 0, numericRunner.stderr);
  assert.equal(numericRunner.stdout.trimEnd(), '[hidden]');
  const invalid = make('greet', 'TOKEN=[hidden]');
  assert.notEqual(invalid.status, 0);
  const root = await mkdtemp(join(skillRoot, '.test-'));
  try {
    await mkdir(join(root, 'scripts', 'wait'), { recursive: true });
    await writeFile(join(root, 'Makefile'), 'wait:\n\t@node scripts/wait/run.ts\n');
    await writeFile(join(root, 'scripts', 'wait', 'run.ts'), `
      import { spawn } from 'node:child_process';
      const child = spawn(process.execPath, ['-e', 'process.on("SIGINT", () => {}); setTimeout(() => {}, 60000)'], { stdio: 'ignore' });
      console.log('child=' + child.pid);
    `);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 250);
    const cancelled = await executeCommand(root, { path: 'wait', definition: { name: 'Wait', help: 'Wait.', inputs: [], run: () => '' } }, {}, controller.signal);
    clearTimeout(timer);
    assert.equal(cancelled.code, 130);
    const childPid = cancelled.output.match(/child=(\d+)/)?.[1];
    assert.ok(childPid, cancelled.output);
    const childStatus = spawnSync('ps', ['-p', childPid, '-o', 'stat='], { encoding: 'utf8' });
    assert.ok(childStatus.status !== 0 || /^[ZX]/.test(childStatus.stdout.trim()), childStatus.stdout);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('split secrets and terminal escapes stay hidden when captured output reaches its limit', async () => {
  const root = await mkdtemp(join(skillRoot, '.test-'));
  const secret = 'split-private-value';
  try {
    await mkdir(join(root, 'scripts', 'output'), { recursive: true });
    await writeFile(join(root, 'Makefile'), '.EXPORT_ALL_VARIABLES:\noutput:\n\t@node scripts/output/run.ts\n');
    await writeFile(join(root, 'scripts', 'output', 'run.ts'), `
      const secret = process.env.TOKEN;
      process.stdout.write(secret.slice(0, 5));
      await new Promise(resolve => setTimeout(resolve, 10));
      process.stdout.write(secret.slice(5) + '\\x1b[31mvisible\\x1b[0m\\n');
      process.stdout.write('x'.repeat(1024 * 1024));
      process.stdout.write(secret);
    `);
    const command = { path: 'output', definition: { name: 'Output', help: 'Output.', inputs: [{ name: 'TOKEN', prompt: 'Secret?', help: 'Secret.', kind: 'text' as const, required: true, secret: true }], run: () => '' } };
    const result = await executeCommand(root, command, { TOKEN: secret }, new AbortController().signal);
    assert.equal(result.code, 0);
    assert.match(result.output, /^\[hidden\]visible/);
    assert.match(result.output, /Remaining output omitted/);
    assert.ok(!result.output.includes(secret));
    assert.ok(!result.output.includes('\x1b'));
    assert.ok(result.output.length < 1024 * 1024 + 100);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Ctrl-C during the visible spinner stops resistant descendants and prints the attempted raw command', { skip: process.platform === 'win32' }, async () => {
  const { readFile } = await import('node:fs/promises');
  const { setTimeout: delay } = await import('node:timers/promises');
  const root = await mkdtemp(join(skillRoot, '.test-'));
  const cli = fileURLToPath(new URL('./cli.ts', import.meta.url));
  let childPid: number | undefined;
  let terminal: ReturnType<typeof pty.spawn> | undefined;
  try {
    await mkdir(join(root, 'scripts', 'wait'), { recursive: true });
    await writeFile(join(root, 'package.json'), '{"type":"module"}');
    await writeFile(join(root, 'Makefile'), `wizard:\n\t@node ${JSON.stringify(cli)} wizard wait --root .\nwait:\n\t@node scripts/wait/run.ts\nnext:\n\t@touch next-ran\n`);
    await writeFile(join(root, 'scripts', 'wait', 'command.ts'), `
      import { spawn } from 'node:child_process';
      import { writeFile } from 'node:fs/promises';
      import { join } from 'node:path';
      export const definition = { name: 'Wait', help: 'Wait.', inputs: [], async run(_inputs, { root }) {
        const child = spawn(process.execPath, ['-e', 'process.on("SIGINT", () => {}); setTimeout(() => {}, 60000)'], { stdio: 'ignore' });
        await writeFile(join(root, 'child.pid'), String(child.pid));
        await new Promise(resolve => child.once('exit', resolve));
        return 'Finished';
      } };
    `);
    await writeFile(join(root, 'scripts', 'wait', 'run.ts'), `import { runCommand } from ${JSON.stringify(engine)}; import { definition } from './command.ts'; await runCommand(definition);`);
    terminal = pty.spawn('/bin/sh', ['-c', 'make --no-print-directory wizard && make --no-print-directory next'], {
      cwd: root,
      name: 'xterm-256color',
      cols: 44,
      rows: 28,
      env: { ...process.env, TERM: 'xterm-256color', NO_COLOR: '1', WIZARD_REDUCED_MOTION: '' },
    });
    let transcript = '';
    terminal.onData(chunk => { transcript += chunk; });
    const exited = new Promise<number>(resolve => terminal!.onExit(event => resolve(event.exitCode)));
    const deadline = Date.now() + 10000;
    while (!childPid) {
      try { childPid = Number(await readFile(join(root, 'child.pid'), 'utf8')); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      if (Date.now() > deadline) throw new Error(`Command did not start: ${transcript}`);
      await delay(25);
    }
    terminal.write('\x03');
    await delay(50);
    terminal.write('\x03');
    let timeout: NodeJS.Timeout | undefined;
    const exitCode = await Promise.race([exited, new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => reject(new Error(`Cancellation did not finish: ${transcript}`)), 10000);
    })]).finally(() => clearTimeout(timeout));
    assert.equal(exitCode, 2, transcript);
    await assert.rejects(access(join(root, 'next-ran')), { code: 'ENOENT' });
    assert.match(transcript, /Interrupted/);
    assert.match(transcript, /make wait/);
    assert.match(transcript, /Error 130/);
    assert.equal(transcript.match(/└ /g)?.length, 1, transcript);
    const status = spawnSync('ps', ['-p', String(childPid), '-o', 'stat='], { encoding: 'utf8' });
    assert.ok(status.status !== 0 || /^[ZX]/.test(status.stdout.trim()), status.stdout);
  } finally {
    terminal?.kill('SIGKILL');
    if (childPid) {
      try { process.kill(childPid, 'SIGKILL'); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
    }
    await rm(root, { recursive: true, force: true });
  }
});

test('blank secrets replay without edits and short secrets preserve every public argument', async () => {
  const command = (await discoverCommands(exampleRoot)).find(command => command.path === 'greet')!;
  const inputs = { NAME: 'Samantha', COUNT: 1, TONE: 'friendly', LOUD: false, TOKEN: '' };
  const replay = rawCommand(command, inputs);
  assert.ok(!replay.includes('TOKEN'));
  assert.ok(!replay.includes('[hidden]'));
  const raw = spawnSync('/bin/sh', ['-c', replay], { cwd: exampleRoot, encoding: 'utf8', env: { ...process.env, TOKEN: '' } });
  assert.equal(raw.status, 0, raw.stderr);
  assert.equal(raw.stdout, 'Hello, Samantha!\n');
  const publicMarker = make('greet', 'NAME=Samantha[hidden]');
  assert.equal(publicMarker.status, 0, publicMarker.stderr);
  assert.equal(publicMarker.stdout, 'Hello, Samantha[hidden]!\n');
  for (const secret of ['a', '1', 'true']) {
    assert.equal(rawCommand(command, { ...inputs, TOKEN: secret }),
      "TOKEN='[hidden]' make greet 'NAME=Samantha' 'COUNT=1' 'TONE=friendly' 'LOUD=false'");
  }
});

test('CI rejects a missing or misnamed command skill and Make control input names', async () => {
  const root = await mkdtemp(join(skillRoot, '.test-'));
  try {
    const folder = join(root, 'scripts', 'report', 'show');
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, 'run.ts'), '');
    await writeFile(join(folder, 'command.ts'), "export const definition = { name: 'Report', help: 'Report.', inputs: [], run: () => 'ok' };");
    await assert.rejects(checkCommands(root), /add its command skill at .agents\/skills\/report-show\/SKILL.md/);
    const skill = join(root, '.agents', 'skills', 'report-show');
    await mkdir(skill, { recursive: true });
    await writeFile(join(skill, 'SKILL.md'), '---\nname: wrong\n---\n');
    await assert.rejects(checkCommands(root), /must declare name: report-show/);
    await writeFile(join(skill, 'SKILL.md'), '---\nname: report-show\n---\n');
    assert.equal((await checkCommands(root)).length, 1);
    for (const name of ['VPATH', 'GNUMAKEFLAGS', 'MAKESHELL', 'SUFFIXES', 'GPATH', 'MAKEFILE_LIST']) {
      const path = join(root, 'scripts', name.toLowerCase().replaceAll('_', '-'));
      await mkdir(path, { recursive: true });
      await writeFile(join(path, 'run.ts'), '');
      await writeFile(join(path, 'command.ts'), `export const definition = { name: 'Unsafe', help: 'Unsafe.', inputs: [{ name: '${name}', prompt: 'Input?', help: 'Input.', required: true, secret: false, kind: 'text' }], run: () => 'ok' };`);
      await assert.rejects(discoverCommands(root), /safe uppercase name/);
      await rm(path, { recursive: true });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Skip bypasses an optional choice default and navigation guidance stays framed at 28 columns', { skip: process.platform === 'win32' }, async () => {
  const { setTimeout: delay } = await import('node:timers/promises');
  const { stripVTControlCharacters } = await import('node:util');
  const root = await mkdtemp(join(skillRoot, '.test-'));
  const cli = fileURLToPath(new URL('./cli.ts', import.meta.url));
  let terminal: ReturnType<typeof pty.spawn> | undefined;
  try {
    const folder = join(root, 'scripts', 'choose');
    await mkdir(folder, { recursive: true });
    await writeFile(join(root, 'package.json'), '{"type":"module"}');
    await writeFile(join(root, 'Makefile'), '.EXPORT_ALL_VARIABLES:\nchoose:\n\t@node scripts/choose/run.ts\n');
    await writeFile(join(folder, 'command.ts'), `export const definition = {
      name: 'Choose', help: 'Choose.', inputs: [{ name: 'MODE', prompt: 'Choose a mode', help: 'Choose a mode.', required: false, secret: false, kind: 'choice', default: 'one', options: [{ value: 'one', label: 'One' }] }],
      run: inputs => 'mode=' + (inputs.MODE || 'blank'),
    };`);
    await writeFile(join(folder, 'run.ts'), `import { runCommand } from ${JSON.stringify(engine)}; import { definition } from './command.ts'; await runCommand(definition);`);
    terminal = pty.spawn(process.execPath, [cli, 'wizard', 'choose', '--root', root], {
      cwd: root, name: 'xterm-256color', cols: 28, rows: 28,
      env: { ...process.env, NO_COLOR: '', FORCE_COLOR: '1', WIZARD_THEME: 'dark', ACCESSIBLE: '1' },
    });
    let transcript = '';
    terminal.onData(chunk => { transcript += chunk; });
    const exited = new Promise<number>(resolve => terminal!.onExit(event => resolve(event.exitCode)));
    const deadline = Date.now() + 10000;
    while (!transcript.includes('Skip')) {
      if (Date.now() > deadline) throw new Error(`Choice did not render: ${transcript}`);
      await delay(25);
    }
    const hint = stripVTControlCharacters(transcript).split(/\r?\n/).find(line => line.includes('↑↓ / Enter'));
    assert.ok(hint, transcript);
    assert.ok(hint.startsWith('│'), transcript);
    assert.ok(hint.length <= 28, hint);
    terminal.write('\x1b[B\r');
    let timeout: NodeJS.Timeout | undefined;
    const exitCode = await Promise.race([exited, new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => reject(new Error(`Choice did not finish: ${transcript}`)), 10000);
    })]).finally(() => clearTimeout(timeout));
    assert.equal(exitCode, 0, transcript);
    assert.match(transcript, /mode=blank/);
    assert.match(transcript, /'MODE='/);
  } finally {
    terminal?.kill('SIGKILL');
    await rm(root, { recursive: true, force: true });
  }
});
