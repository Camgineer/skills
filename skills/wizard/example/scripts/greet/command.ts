import type { Command } from '#wizard';

export const definition = {
  name: 'Say hello',
  help: 'Print a greeting with a chosen tone.',
  inputs: [
    { name: 'NAME', prompt: 'Who is the greeting for?', help: 'Enter a name. Type ? here to read this help.', required: true, secret: false, kind: 'text', default: 'World' },
    { name: 'TONE', prompt: 'Choose a tone', help: 'Friendly says hello. Formal says good day.', required: true, secret: false, kind: 'choice', default: 'friendly', options: [
      { value: 'friendly', label: 'Friendly' },
      { value: 'formal', label: 'Formal' },
    ] },
    { name: 'COUNT', prompt: 'How many greetings?', help: 'Enter a finite number between 1 and 5.', required: true, secret: false, kind: 'number', default: 1 },
    { name: 'LOUD', prompt: 'Use uppercase?', help: 'Choose yes for uppercase text.', required: true, secret: false, kind: 'confirm', default: false },
    { name: 'TOKEN', prompt: 'Optional private note', help: 'A fake secret for this example. Leave blank to skip. The result masks it.', required: false, secret: true, kind: 'text' },
  ],
  run(inputs) {
    const count = Number(inputs.COUNT);
    if (!Number.isInteger(count) || count < 1 || count > 5) throw new Error('COUNT must be an integer from 1 to 5.');
    const greeting = `${inputs.TONE === 'formal' ? 'Good day' : 'Hello'}, ${inputs.NAME}!`;
    const result = Array(count).fill(inputs.LOUD ? greeting.toUpperCase() : greeting).join('\n');
    return inputs.TOKEN ? `${result}\nPrivate note: ${inputs.TOKEN}` : result;
  },
} satisfies Command;
