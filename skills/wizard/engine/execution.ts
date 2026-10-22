import { spawn } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { createRedactor, secretMask } from './redaction.ts';
import { cancelledExitCode, populatedSecretInputs, safeOutput, secretInputs } from './command.ts';
import type { InputValue } from './command.ts';
import type { DiscoveredCommand } from './discovery.ts';

// Commands return concise results; cap logs to keep terminal output and memory bounded.
const outputLimitBytes = 1024 * 1024;
// Give the process group time to handle SIGINT before enforcing termination.
const interruptGraceMs = 2000;

function quote(argument: string): string {
  return `'${argument.replaceAll("'", "'\\''")}'`;
}

function assignments(inputs: Readonly<Record<string, InputValue>>): string[] {
  return Object.entries(inputs).map(([name, value]) => `${name}=${String(value).replaceAll('$', () => '$$')}`);
}

export function rawCommand(command: DiscoveredCommand, inputs: Readonly<Record<string, InputValue>>): string {
  const publicInputs = { ...inputs };
  const secretPrefix: string[] = [];
  for (const input of populatedSecretInputs(command.definition, inputs)) {
    secretPrefix.push(`${input.name}=${quote(secretMask)}`);
  }
  for (const input of secretInputs(command.definition)) delete publicInputs[input.name];
  return [...secretPrefix, 'make', command.path, ...assignments(publicInputs).map(quote)].join(' ');
}

export async function executeCommand(
  root: string,
  command: DiscoveredCommand,
  inputs: Readonly<Record<string, InputValue>>,
  signal: AbortSignal,
): Promise<{ code: number; output: string }> {
  const publicInputs = { ...inputs };
  const environment = { ...process.env, MAKEFLAGS: '', MFLAGS: '', MAKEOVERRIDES: '' };
  const secrets: string[] = [];
  for (const input of command.definition.inputs) {
    delete environment[input.name as keyof typeof environment];
  }
  for (const input of secretInputs(command.definition)) {
    const secret = String(inputs[input.name]);
    (environment as NodeJS.ProcessEnv)[input.name] = secret;
    secrets.push(secret);
    delete publicInputs[input.name];
  }
  delete (environment as NodeJS.ProcessEnv).CONFIRM;
  const child = spawn('make', ['--no-print-directory', command.path, ...assignments(publicInputs)], {
    cwd: root,
    env: environment,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const chunks: Buffer[] = [];
  let capturedBytes = 0;
  let truncated = false;
  let timer: NodeJS.Timeout | undefined;
  let interruption: Promise<void> | undefined;
  const sendGroupSignal = (processSignal: NodeJS.Signals) => {
    if (!child.pid) return;
    try {
      if (process.platform === 'win32') child.kill(processSignal);
      else process.kill(-child.pid, processSignal);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
    }
  };
  const interrupt = () => {
    sendGroupSignal('SIGINT');
    interruption = new Promise(resolve => {
      timer = setTimeout(() => {
        sendGroupSignal('SIGKILL');
        resolve();
      }, interruptGraceMs);
    });
  };
  const capture = (text: string) => {
    const chunk = Buffer.from(text);
    const room = outputLimitBytes - capturedBytes;
    if (chunk.length > room) truncated = true;
    if (room <= 0) return;
    const portion = chunk.subarray(0, room);
    chunks.push(portion);
    capturedBytes += portion.length;
  };
  function redactedStream(stream: NodeJS.ReadableStream) {
    const decoder = new StringDecoder('utf8');
    const redactor = createRedactor(secrets);
    stream.on('data', (chunk: Buffer) => capture(redactor.write(decoder.write(chunk))));
    stream.on('end', () => capture(redactor.write(decoder.end()) + redactor.finish()));
  }
  redactedStream(child.stdout);
  redactedStream(child.stderr);
  signal.addEventListener('abort', interrupt, { once: true });
  if (signal.aborted) interrupt();

  try {
    const code = await new Promise<number>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code, exitSignal) => resolve(
        signal.aborted || exitSignal === 'SIGINT' ? cancelledExitCode : code ?? 1,
      ));
    });
    await interruption;
    let output = safeOutput(Buffer.concat(chunks).toString('utf8')).trimEnd();
    if (truncated) output += `\n[Output exceeded ${outputLimitBytes.toLocaleString('en-US')} bytes. Remaining output omitted.]`;
    return { code, output };
  } finally {
    signal.removeEventListener('abort', interrupt);
    clearTimeout(timer);
  }
}
