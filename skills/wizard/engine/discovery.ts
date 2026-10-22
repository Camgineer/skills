import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateDefinition } from './command.ts';
import type { Command } from './command.ts';

export type DiscoveredCommand = { path: string; definition: Command };
const segmentName = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export async function commandPaths(root: string): Promise<string[]> {
  const paths: string[] = [];
  async function visit(relative: string): Promise<void> {
    const entries = await readdir(join(root, 'scripts', relative), { withFileTypes: true });
    const hasRun = entries.some(entry => entry.isFile() && entry.name === 'run.ts');
    const hasDefinition = entries.some(entry => entry.isFile() && entry.name === 'command.ts');
    if (hasRun || hasDefinition) {
      if (!relative || relative === 'check-commands' || !relative.split('/').every(segment => segmentName.test(segment) && segment !== 'wizard')) {
        throw new Error('Command paths need lowercase kebab-case segments; wizard and the root check-commands target are reserved.');
      }
      if (!hasRun || !hasDefinition) throw new Error(`scripts/${relative} needs both command.ts and run.ts.`);
      paths.push(relative);
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) throw new Error(`scripts/${relative}/${entry.name}: use regular files and folders.`);
      if (entry.isDirectory()) await visit(relative ? `${relative}/${entry.name}` : entry.name);
    }
  }
  await visit('');
  return paths.sort();
}

export async function discoverCommands(root: string): Promise<DiscoveredCommand[]> {
  const commands: DiscoveredCommand[] = [];
  const skillNames = new Set<string>();
  for (const path of await commandPaths(root)) {
    const skillName = path.replaceAll('/', '-');
    if (skillNames.has(skillName)) throw new Error(`${path}: command skill name ${skillName} collides with another path.`);
    skillNames.add(skillName);
    try {
      const module = await import(pathToFileURL(join(root, 'scripts', path, 'command.ts')).href);
      validateDefinition(module.definition);
      commands.push({ path, definition: module.definition });
    } catch (error) {
      throw new Error(`${path}: ${error instanceof Error ? error.message : 'cannot load definition'}`, { cause: error });
    }
  }
  return commands;
}
