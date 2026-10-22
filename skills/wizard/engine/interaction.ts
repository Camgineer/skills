import * as clack from '@clack/prompts';
import { parseInput } from './command.ts';
import type { Input, InputValue } from './command.ts';
import type { DiscoveredCommand } from './discovery.ts';
import { Cancelled } from './terminal.ts';
import type { Terminal } from './terminal.ts';

export async function chooseCommand(commands: DiscoveredCommand[], scope: string, terminal: Terminal): Promise<DiscoveredCommand> {
  if (!commands.length) throw new Error('No commands found. Add a command under scripts/ and run check-commands.');
  let level = scope;
  while (true) {
    const exact = commands.find(command => command.path === level);
    const prefix = level ? `${level}/` : '';
    const descendants = commands.filter(command => command.path.startsWith(prefix) && command.path !== level);
    const leafCommand = exact && !descendants.length;
    if (leafCommand) return exact;
    const missingScope = !exact && !descendants.length;
    if (missingScope) throw new Error(`No command or namespace named ${level}.`);

    const children = [...new Set(descendants.map(command => command.path.slice(prefix.length).split('/')[0]))];
    const options = children.map(child => {
      const path = `${prefix}${child}`;
      const childCommand = commands.find(command => command.path === path);
      const namespace = commands.some(command => command.path.startsWith(`${path}/`));
      return {
        value: path,
        label: namespace ? `${child}/` : childCommand!.definition.name,
        hint: namespace ? 'Commands' : childCommand!.definition.help,
      };
    });
    if (exact) options.unshift({ value: ':run', label: `Run ${exact.definition.name}`, hint: exact.definition.help });
    if (level) options.push({ value: ':back', label: 'Back', hint: 'Parent menu' });
    terminal.showStep(level ? `Commands / ${level}` : 'Commands');
    const selection = await terminal.select('Choose a command', options);
    if (selection === ':run') return exact!;
    level = selection === ':back' ? level.split('/').slice(0, -1).join('/') : selection;
  }
}

async function askInput(input: Input, title: string, terminal: Terminal): Promise<InputValue> {
  const { answer, prompts, screen } = terminal;
  while (true) {
    terminal.showStep(title);
    const validate = (raw: string | undefined) => {
      const helpRequested = raw === '?' && !input.secret;
      if (helpRequested) return;
      try {
        parseInput(input, raw);
      } catch (error) {
        return error instanceof Error ? error.message : 'Check this value.';
      }
    };
    if (input.secret) {
      clack.log.info(input.help, screen);
      const secret = await answer(clack.password({ ...prompts, message: `${input.prompt} (hidden)`, validate }));
      return parseInput(input, secret);
    }
    if (input.kind === 'choice') {
      const help = Symbol('help');
      const options: { value: string | typeof help; label: string }[] = input.options.map(
        option => ({ value: option.value, label: option.label }),
      );
      if (!input.required) options.push({ value: '', label: 'Skip' });
      options.push({ value: help, label: 'Help' });
      const selected = await terminal.select(input.prompt, options, input.default);
      if (selected !== help) return parseInput(input, selected);
      await terminal.showHelp(input.help);
      continue;
    }
    if (input.kind === 'confirm') {
      clack.log.info(input.help, screen);
      return answer(clack.confirm({ ...prompts, message: input.prompt, initialValue: input.default ?? false }));
    }
    const typed = await answer(clack.text({
      ...prompts,
      message: `${input.prompt} (? for help)`,
      defaultValue: input.default === undefined ? undefined : String(input.default),
      placeholder: input.default === undefined ? undefined : String(input.default),
      validate,
    }));
    if (typed === '?') {
      await terminal.showHelp(input.help);
      continue;
    }
    return parseInput(input, typed);
  }
}

export async function prepareInputs(command: DiscoveredCommand, terminal: Terminal): Promise<Record<string, InputValue>> {
  const { definition } = command;
  const { answer, prompts, screen } = terminal;
  const inputs: Record<string, InputValue> = {};
  for (const stage of definition.stages ?? []) {
    terminal.showStep(`${definition.name} / ${stage.name}`);
    clack.log.info(stage.help, screen);
    const completed = await answer(clack.confirm({ ...prompts, message: 'Is this step complete?', initialValue: false }));
    if (!completed) throw new Cancelled();
  }
  for (const input of definition.inputs) inputs[input.name] = await askInput(input, definition.name, terminal);
  if (definition.irreversible) {
    terminal.showStep(definition.name);
    clack.log.warn(definition.irreversible, screen);
    const confirmed = await answer(clack.confirm({ ...prompts, message: 'Run this action? It cannot be undone.', initialValue: false }));
    if (!confirmed) throw new Cancelled();
    inputs.CONFIRM = true;
  }
  return inputs;
}
