import { resolve } from 'node:path';
import { checkCommands, commandPaths } from './discovery.ts';
import { safeOutput } from './command.ts';

try {
  const [action, ...args] = process.argv.slice(2);
  const rootFlag = args.indexOf('--root');
  const root = resolve(rootFlag === -1 ? '.' : args[rootFlag + 1] ?? '.');
  const scope = rootFlag === 0 ? '' : args[0] ?? '';
  if (action === 'list-commands') {
    process.stdout.write((await commandPaths(root)).join(' '));
  } else if (action === 'check-commands') {
    const commands = await checkCommands(root);
    console.log(`Checked ${commands.length} command declarations.`);
  } else if (action === 'wizard') {
    const { wizard } = await import('./wizard.ts');
    await wizard(root, scope);
  } else {
    throw new Error('Use wizard [path], check-commands, or list-commands, with optional --root <directory>.');
  }
} catch (error) {
  console.error(safeOutput(error instanceof Error ? error.message : 'Wizard failed.'));
  process.exitCode = 1;
}
