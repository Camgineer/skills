export const secretMask = '[hidden]';

export function createRedactor(secrets: readonly string[]) {
  const longestFirst = [...new Set(secrets.filter(Boolean))].sort((a, b) => b.length - a.length);
  const guardCharacters = Math.max(0, ...longestFirst.map(secret => secret.length - 1));
  let pending = '';

  function flush(end: number): string {
    let cursor = 0;
    let redacted = '';
    while (cursor < end) {
      const secret = longestFirst.find(secret => pending.startsWith(secret, cursor));
      if (secret) {
        redacted += secretMask;
        cursor += secret.length;
      } else {
        redacted += pending[cursor];
        cursor++;
      }
    }
    pending = pending.slice(cursor);
    return redacted;
  }

  return {
    write(text: string): string {
      pending += text;
      return flush(Math.max(0, pending.length - guardCharacters));
    },
    finish(): string {
      return flush(pending.length);
    },
  };
}
