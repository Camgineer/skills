import type { Command } from '#wizard';

export const definition = {
  name: 'Sign in with a code',
  help: 'Send a one-time code, accept it as hidden input, and load the example profile.',
  interactive: true,
  inputs: [
    {
      name: 'EMAIL',
      prompt: 'Which email address?',
      help: 'Enter any address. The example shows its code here instead of sending email.',
      required: true,
      secret: false,
      kind: 'text',
      default: 'you@example.com',
    },
  ],
  async run(inputs, context) {
    const { signIn } = await import('./sign-in.ts');

    return signIn(String(inputs.EMAIL), context);
  },
} satisfies Command;
