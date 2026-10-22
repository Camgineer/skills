import { randomInt } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { CommandContext } from '#wizard';

const codeDigits = 6;
// Long enough to show progress and to test Ctrl-C while it runs.
const profileLoadMs = 2000;

export async function signIn(email: string, { signal, terminal }: CommandContext): Promise<string> {
  const humanAtTerminal = process.stdin.isTTY && process.stdout.isTTY;

  if (!humanAtTerminal) throw new Error('Sign-in needs a person at a terminal to type the code.');

  const code = String(randomInt(10 ** codeDigits)).padStart(codeDigits, '0');

  terminal.showStep('Check your email');
  terminal.info(`Example inbox for ${email}: your code is ${code}.`);
  const typed = await terminal.password('Enter the code (hidden)', (value) => {
    const wellFormed = new RegExp(`^\\d{${codeDigits}}$`).test(value ?? '');

    if (!wellFormed) return `Enter the ${codeDigits}-digit code.`;
  });
  const matchesCode = typed === code;

  if (!matchesCode) throw new Error('That code does not match. Run sign-in again for a new code.');

  terminal.showStep('Loading your profile');
  await terminal.withProgress(() => delay(profileLoadMs, undefined, { signal }));

  return `Signed in as ${email}.`;
}
