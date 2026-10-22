import { readFile, readdir } from 'node:fs/promises';
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
      const validPath = relative !== '' && relative !== 'check-commands'
        && relative.split('/').every(segment => segmentName.test(segment) && segment !== 'wizard');
      if (!validPath) {
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

export async function checkCommands(root: string): Promise<DiscoveredCommand[]> {
  const commands = await discoverCommands(root);
  if (commands.length === 0) throw new Error('No commands found under scripts/.');
  for (const command of commands) {
    const skillName = command.path.replaceAll('/', '-');
    const skillFile = `.agents/skills/${skillName}/SKILL.md`;
    let source: string;
    try {
      source = await readFile(join(root, skillFile), 'utf8');
    } catch (error) {
      throw new Error(`${command.path}: add its command skill at ${skillFile}.`, { cause: error });
    }
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    const expectedName = new RegExp(`^name: *(?:${skillName}|"${skillName}"|'${skillName}') *$`, 'm');
    const validSkillName = frontmatter !== undefined && expectedName.test(frontmatter);
    if (!validSkillName) {
      throw new Error(`${command.path}: ${skillFile} must declare name: ${skillName}.`);
    }
  }
  return commands;
}
