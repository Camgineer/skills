import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { pollIntervalMs } from '../engine/fixtures/interactive.ts';

const require = createRequire(new URL('../node_modules/.proof/package.json', import.meta.url));
const pty = require('@lydell/node-pty');
const { Terminal } = require('@xterm/headless');
const { Resvg } = require('@resvg/resvg-js');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const recordings = join(root, 'recordings');
const fixtureRunner = join(root, 'engine/fixtures/run-interactive.ts');

const columns = 80;
const rows = 24;
const cellWidth = 10;
const cellHeight = 21;
const horizontalPadding = 24;
const firstBaseline = 76;
const headerBaseline = 30;
const dividerY = 46;
const canvasWidth = columns * cellWidth + horizontalPadding * 2;
const canvasHeight = 598;
const terminalFontSize = 16;
const headerFontSize = 15;
// Limit the palette to keep GIFs compact while retaining antialiased text and terminal accents.
const paletteSize = 64;
const transcriptTailLength = 400;

// Review pauses keep each action visible; fixture deadlines allow rendering without waiting for stubborn work.
const frameMs = 160;
const deadlineMs = 8000;
const outputSettleMs = 200;
const finalFrameHoldMs = 1800;
const emailReviewMs = 350;
const codeReviewMs = 800;
const readyReviewMs = 650;
const abortReviewMs = 500;

const background = '#17171c';
const foreground = '#eeeaf0';
const accent = '#d2b5e4';
const divider = '#45404b';
const terminalColors = {
  1: '#e5a5af',
  2: '#b0c99c',
  3: '#dfc29b',
  5: accent,
  6: '#b9bad6',
  8: '#8d8994',
};

function escapeText(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderLine(line, row) {
  const textRuns = [];
  let run = '';
  let color;
  let start = 0;

  function flush(column) {
    const hasText = run.length > 0;

    if (hasText) {
      const x = horizontalPadding + start * cellWidth;
      const y = firstBaseline + row * cellHeight;

      textRuns.push(`<text x="${x}" y="${y}" fill="${color}">${escapeText(run)}</text>`);
    }

    run = '';
    start = column;
  }

  for (let column = 0; column < columns; column++) {
    const cell = line?.getCell(column);
    const code = cell?.getFgColor() ?? -1;
    const nextColor = terminalColors[code] ?? foreground;
    const colorChanged = nextColor !== color;

    if (colorChanged) {
      flush(column);
      color = nextColor;
    }

    run += cell?.getChars() || ' ';
  }

  flush(columns);

  return textRuns.join('\n');
}

function renderTerminalText(terminal) {
  const lines = [];

  for (let row = 0; row < rows; row++) {
    const line = terminal.buffer.active.getLine(terminal.buffer.active.viewportY + row);

    lines.push(renderLine(line, row));
  }

  return lines.join('\n');
}

function screenshot(terminal, label) {
  const terminalText = renderTerminalText(terminal);
  const dividerEnd = canvasWidth - horizontalPadding;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}">
      <rect width="${canvasWidth}" height="${canvasHeight}" fill="${background}"/>
      <text x="${horizontalPadding}" y="${headerBaseline}"
        fill="${accent}" font-family="Menlo" font-size="${headerFontSize}">${escapeText(label)}</text>
      <path d="M${horizontalPadding} ${dividerY}H${dividerEnd}" stroke="${divider}"/>
      <g font-family="Menlo" font-size="${terminalFontSize}" xml:space="preserve">
        ${terminalText}
      </g>
    </svg>
  `;

  const renderer = new Resvg(svg, {
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'Menlo',
    },
  });

  return renderer.render();
}

function encodeFrames(frames) {
  const gif = GIFEncoder();

  for (const [index, rgba] of frames.entries()) {
    const palette = quantize(rgba, paletteSize);
    const bitmap = applyPalette(rgba, palette);
    const finalFrame = index === frames.length - 1;
    const durationMs = finalFrame ? finalFrameHoldMs : frameMs;

    gif.writeFrame(bitmap, canvasWidth, canvasHeight, {
      palette,
      delay: durationMs,
    });
  }

  gif.finish();

  return gif.bytes();
}

async function writeRecording(name, label, events, frames, terminal) {
  const gif = encodeFrames(frames);
  const castHeader = {
    version: 2,
    width: columns,
    height: rows,
    title: label,
  };
  const castLines = [
    JSON.stringify(castHeader),
    ...events.map(event => JSON.stringify(event)),
  ];
  const cast = castLines.join('\n') + '\n';
  const finalScreen = screenshot(terminal, label).asPng();

  await writeFile(join(recordings, `${name}.gif`), gif);
  await writeFile(join(recordings, `${name}.cast`), cast);
  await writeFile(join(root, 'node_modules/.proof', `${name}.png`), finalScreen);
}

async function awaitExit(exited) {
  let timeout;
  const expired = new Promise((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error('Recording timed out')), deadlineMs);
  });

  try {
    return await Promise.race([exited, expired]);
  } finally {
    clearTimeout(timeout);
  }
}

async function capture(name, command, drive, options = {}) {
  const label = options.label ?? command;
  const terminal = new Terminal({
    cols: columns,
    rows,
    allowProposedApi: true,
  });
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

  child.onData(chunk => {
    transcript += chunk;
    events.push([(performance.now() - started) / 1000, 'o', chunk]);

    terminal.write(chunk);
  });

  const exited = new Promise(resolve => {
    child.onExit(resolve);
  });
  const frames = [];
  const sample = () => frames.push(screenshot(terminal, label).pixels);
  const timer = setInterval(sample, frameMs);

  async function waitFor(text) {
    const deadline = Date.now() + deadlineMs;

    while (!stripVTControlCharacters(transcript).includes(text)) {
      assert.ok(Date.now() < deadline, `Missing ${text}: ${transcript}`);

      await delay(pollIntervalMs);
    }
  }

  try {
    await drive({
      write: text => child.write(text),
      waitFor,
      transcript: () => stripVTControlCharacters(transcript),
    });

    const status = await awaitExit(exited);

    await delay(outputSettleMs);
    sample();
    clearInterval(timer);

    await writeRecording(name, label, events, frames, terminal);

    const plainTranscript = stripVTControlCharacters(transcript);
    const tail = plainTranscript.slice(-transcriptTailLength);

    console.log(name, status, `${frames.length} frames`, tail);

    return plainTranscript;
  } finally {
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
    await delay(emailReviewMs);
    write('\r');

    await waitFor('Enter the code (hidden)');

    const code = transcript().match(/your code is (\d{6})/)?.[1];

    assert.ok(code);

    await delay(codeReviewMs);
    write(code + '\r');

    await waitFor('Signed in as');
  },
);

assert.match(success, /Signed in as you@example.com/);
assert.match(success, /Complete/);
assert.doesNotMatch(success, /CODE=|PASSWORD=/);

for (const interactive of [false, true]) {
  const fixtureName = interactive ? 'recordingInteractive' : 'recordingRaw';
  const command = [
    "trap 'true' INT",
    `${JSON.stringify(process.execPath)} ${JSON.stringify(fixtureRunner)} ${fixtureName}`,
    'echo "Exit code: $?"',
    'stty -a',
  ].join('; ');
  const name = interactive ? 'interactive-force-stop' : 'raw-interrupt';
  const label = interactive
    ? 'Interactive command: first Ctrl-C aborts; second Ctrl-C exits'
    : 'Raw command: one Ctrl-C stops work that ignores the signal';

  const transcript = await capture(
    name,
    command,
    async ({ write, waitFor }) => {
      await waitFor('Ready.');
      await delay(readyReviewMs);
      write('\x03');

      if (interactive) {
        await waitFor('Signal aborted.');
        await delay(abortReviewMs);
        write('\x03');
      }
    },
    { label },
  );

  assert.match(transcript, /Exit code: 130/);
  assert.doesNotMatch(transcript, /must-not-complete/);
  assert.match(transcript, /(?<!-)icanon/);
}
