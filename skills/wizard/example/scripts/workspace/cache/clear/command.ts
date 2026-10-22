import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Command } from '#wizard';

export const definition = {
  name: 'Clear example cache',
  help: 'Remove the example greeting cache file.',
  inputs: [],
  stages: [{ name: 'Check the cache', help: 'Finish any work that needs .cache/greeting.txt before clearing it.' }],
  irreversible: 'This removes .cache/greeting.txt from this example. Its contents cannot be recovered.',
  async run(_inputs, { root }) {
    await rm(join(root, '.cache', 'greeting.txt'), { force: true });
    return 'Example greeting cache cleared.';
  },
} satisfies Command;
