import * as clack from '@clack/prompts';
import { discoverCommands } from './discovery.ts';
import type { DiscoveredCommand } from './discovery.ts';
import { cancelledExitCode, populatedSecretInputs, safeOutput, secretInputs } from './command.ts';
import type { InputValue } from './command.ts';
import { executeCommand, rawCommand } from './execution.ts';
import { chooseCommand, prepareInputs } from './interaction.ts';
import { Cancelled, createTerminal } from './terminal.ts';

export async function wizard(root: string, scope: string): Promise<void> {
  const interactive = process.stdin.isTTY && process.stdout.isTTY;
  if (!interactive) {
    throw new Error('Wizard needs an interactive terminal. Use make <command> NAME=value for automation.');
  }
  const controller = new AbortController();
  const terminal = createTerminal(controller);
  const { screen, output } = terminal;
  const cancel = () => controller.abort();
  process.on('SIGINT', cancel);
  let ran = false;
  let inputs: Record<string, InputValue> = {};
  let chosen: DiscoveredCommand | undefined;

  try {
    const commands = await discoverCommands(root);
    chosen = await chooseCommand(commands, scope, terminal);
    inputs = await prepareInputs(chosen, terminal);
    terminal.showStep(chosen.definition.name);
    ran = true;
    const command = chosen;
    const result = await terminal.withProgress(() => executeCommand(root, command, inputs, controller.signal));
    if (result.output) clack.log.message(result.output, screen);
    if (result.code === cancelledExitCode) throw new Cancelled();
    if (result.code === 0) clack.log.success('Complete', screen);
    else clack.log.error(`Command failed (exit ${result.code}). Review the result before retrying.`, screen);
    process.exitCode = result.code;
  } catch (error) {
    const cancelled = controller.signal.aborted || error instanceof Cancelled;
    if (cancelled) {
      if (ran) clack.log.warn('Interrupted. Review any effects before retrying.', screen);
      else clack.cancel('Cancelled. Command did not run.', screen);
      process.exitCode = cancelledExitCode;
    } else {
      const secrets = chosen ? secretInputs(chosen.definition).map(input => String(inputs[input.name] ?? '')) : [];
      clack.log.error(safeOutput(error instanceof Error ? error.message : 'Wizard failed.', secrets), screen);
      if (!ran) clack.outro('Check the command declaration and try again.', screen);
      process.exitCode = 1;
    }
  } finally {
    const attemptedCommand = ran ? chosen : undefined;
    if (attemptedCommand) {
      clack.outro('Raw command', screen);
      const secretsMasked = populatedSecretInputs(attemptedCommand.definition, inputs).length > 0;
      if (secretsMasked) {
        output.write('Secret values are masked. Replace [hidden] before running.\n');
      }
      output.write(`${rawCommand(attemptedCommand, inputs)}\n`);
    }
    process.removeListener('SIGINT', cancel);
  }
}
