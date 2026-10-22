import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

const require = createRequire(new URL('../node_modules/.proof/package.json', import.meta.url));
const pty = require('@lydell/node-pty');
const { Terminal } = require('@xterm/headless');
const { Resvg } = require('@resvg/resvg-js');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const recordings = join(root, 'recordings');
const columns = 80;
const rows = 24;
const frameMs = 160;
// Fixtures finish promptly; this deadline bounds a broken interaction.
const deadlineMs = 8000;
const background = '#17171c';
const foreground = '#eeeaf0';
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function screenshot(terminal, label) {
  const text = [];
  for (let row = 0; row < rows; row++) {
    const line = terminal.buffer.active.getLine(terminal.buffer.active.viewportY + row);
    let run = '';
    let color;
    let start = 0;
    const flush = (column) => {
      if (run) text.push(`<text x="${24 + start * 10}" y="${76 + row * 21}" fill="${color}">${escape(run)}</text>`);
      run = '';
      start = column;
    };
    for (let column = 0; column < columns; column++) {
      const cell = line?.getCell(column);
      const code = cell?.getFgColor() ?? -1;
      const colors = { 1: '#e5a5af', 2: '#b0c99c', 3: '#dfc29b', 5: '#d2b5e4', 6: '#b9bad6', 8: '#8d8994' };
      const nextColor = colors[code] ?? foreground;
      if (nextColor !== color) {
        flush(column);
        color = nextColor;
      }
      run += cell?.getChars() || ' ';
    }
    flush(columns);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="848" height="598"><rect width="848" height="598" fill="${background}"/><text x="24" y="30" fill="#d2b5e4" font-family="Menlo" font-size="15">${escape(label)}</text><path d="M24 46H824" stroke="#45404b"/><g font-family="Menlo" font-size="16" xml:space="preserve">${text.join('')}</g></svg>`;
  return new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Menlo' } }).render();
}

async function capture(name, command, drive, options = {}) {
  const label = options.label ?? command;
  const terminal = new Terminal({ cols: columns, rows, allowProposedApi: true });
  const child = pty.spawn('/bin/sh', ['-c', command], {
    cwd: options.cwd ?? join(root, 'example'),
    cols: columns,
    rows,
    name: 'xterm-256color',
    env: { ...process.env, ACCESSIBLE: '1', NO_COLOR: '1', ...options.env },
  });
  const events = [];
  const started = performance.now();
  let transcript = '';
  child.onData((chunk) => {
    transcript += chunk;
    events.push([(performance.now() - started) / 1000, 'o', chunk]);
    terminal.write(chunk);
  });
  const exited = new Promise((resolve) => child.onExit(resolve));
  const frames = [];
  const sample = () => frames.push(screenshot(terminal, label).pixels);
  const timer = setInterval(sample, frameMs);
  const waitFor = async (text) => {
    const deadline = Date.now() + deadlineMs;
    while (!stripVTControlCharacters(transcript).includes(text)) {
      assert.ok(Date.now() < deadline, `Missing ${text}: ${transcript}`);
      await delay(20);
    }
  };
  let exitTimer;

  try {
    await drive({
      write: (text) => child.write(text),
      waitFor,
      transcript: () => stripVTControlCharacters(transcript),
    });
    const status = await Promise.race([
      exited,
      new Promise((_resolve, reject) => {
        exitTimer = setTimeout(() => reject(new Error('Recording timed out')), deadlineMs);
      }),
    ]);
    await delay(200);
    sample();
    const gif = GIFEncoder();
    for (const [index, rgba] of frames.entries()) {
      const palette = quantize(rgba, 64);
      const bitmap = applyPalette(rgba, palette);
      gif.writeFrame(bitmap, 848, 598, { palette, delay: index === frames.length - 1 ? 1800 : frameMs });
    }
    gif.finish();
    await writeFile(join(recordings, `${name}.gif`), gif.bytes());
    await writeFile(
      join(recordings, `${name}.cast`),
      [
        JSON.stringify({ version: 2, width: columns, height: rows, title: label }),
        ...events.map((event) => JSON.stringify(event)),
      ].join('\n') + '\n',
    );
    await writeFile(join(root, 'node_modules/.proof', `${name}.png`), screenshot(terminal, label).asPng());
    console.log(name, status, `${frames.length} frames`, stripVTControlCharacters(transcript).slice(-400));
    return stripVTControlCharacters(transcript);
  } finally {
    clearTimeout(exitTimer);
    clearInterval(timer);
    child.kill('SIGKILL');
    terminal.dispose();
  }
}

const success = await capture(
  'interactive-sign-in',
  'make --no-print-directory sign-in/wizard',
  async ({ write, waitFor, transcript }) => {
    await waitFor('Which email address?');
    await delay(350);
    write('\r');
    await waitFor('Enter the code (hidden)');
    const code = transcript().match(/your code is (\d{6})/)?.[1];
    assert.ok(code);
    await delay(800);
    write(code + '\r');
    await waitFor('Signed in as');
  },
);
assert.match(success, /Signed in as you@example.com/);
assert.match(success, /Complete/);
assert.doesNotMatch(success, /CODE=|PASSWORD=/);

const fixture = join(root, '.test-recordings');
await mkdir(fixture, { recursive: true });
try {
  const engine = join(root, 'engine/command.ts');
  const source = (interactive) => `import { runCommand } from ${JSON.stringify(engine)};
await runCommand({ name: 'Read records', help: 'Fake read that ignores abort.', interactive: ${interactive}, inputs: [],
  async run(_inputs, { signal, terminal }) {
    const wait = async () => {
      signal.addEventListener('abort', () => console.log('Signal aborted. Operation keeps waiting.'));
      console.log('Ready. This operation ignores the signal.');
      await new Promise(resolve => setTimeout(resolve, 60000));
      return 'must-not-complete';
    };
    return ${interactive ? 'terminal.withProgress(wait)' : 'wait()'};
  },
});`;
  for (const interactive of [false, true]) {
    await writeFile(join(fixture, 'read.ts'), source(interactive));
    const command = `trap 'true' INT; ${JSON.stringify(process.execPath)} read.ts; echo "Exit code: $?"; stty -a`;
    const transcript = await capture(
      interactive ? 'interactive-force-stop' : 'raw-interrupt',
      command,
      async ({ write, waitFor }) => {
        await waitFor('Ready.');
        await delay(650);
        write('\x03');
        if (interactive) {
          await waitFor('Signal aborted.');
          await delay(500);
          write('\x03');
        }
      },
      {
        cwd: fixture,
        label: interactive
          ? 'Interactive command: first Ctrl-C aborts; second Ctrl-C exits'
          : 'Raw command: one Ctrl-C stops work that ignores the signal',
      },
    );
    assert.match(transcript, /Exit code: 130/);
    assert.doesNotMatch(transcript, /must-not-complete/);
    assert.match(transcript, /(?<!-)icanon/);
  }
} finally {
  await rm(fixture, { recursive: true, force: true });
}
