import { runCommand } from '../command.ts';
import { fixtures } from './interactive.ts';

const requestedName = process.argv[2];
const definition = Object.entries(fixtures).find(([name]) => name === requestedName)?.[1];
const found = definition !== undefined;

if (!found) throw new Error('Unknown interactive fixture.');

await runCommand(definition);
