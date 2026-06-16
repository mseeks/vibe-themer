/**
 * Composition root. The only file that knows about both VS Code and the use cases:
 * it builds the concrete adapters, assembles the `Capabilities`, and registers each
 * command from the typed registry. Activation is fully synchronous — commands exist
 * the instant the extension loads (no async-ordering hazard like v1's).
 */

import * as vscode from 'vscode';
import { createAnthropicAdapter } from './adapters/anthropic/gateway';
import { createModelGateway } from './adapters/gateway';
import { createOpenAiAdapter } from './adapters/openai/gateway';
import { systemClock } from './adapters/vscode/clock';
import { createConfigStore } from './adapters/vscode/config';
import { createLogger } from './adapters/vscode/logger';
import { createPreferences } from './adapters/vscode/preferences';
import { createPromptLibrary } from './adapters/vscode/prompts';
import { createSecretStore } from './adapters/vscode/secrets';
import { createUi } from './adapters/vscode/ui';
import { commandHandlers } from './commands';
import { type Capabilities } from './ports';

export function activate(context: vscode.ExtensionContext): void {
  const channel = vscode.window.createOutputChannel('Vibe Themer');
  context.subscriptions.push(channel);
  const logger = createLogger(channel);

  const capabilities: Capabilities = {
    secrets: createSecretStore(context.secrets),
    gateway: createModelGateway({
      openai: createOpenAiAdapter(),
      anthropic: createAnthropicAdapter(),
    }),
    config: createConfigStore(logger),
    prompts: createPromptLibrary(context),
    preferences: createPreferences(context.globalState),
    ui: createUi(),
    clock: systemClock,
    logger,
  };

  const handlers = commandHandlers(capabilities);
  for (const [id, handler] of Object.entries(handlers)) {
    context.subscriptions.push(vscode.commands.registerCommand(id, () => handler()));
  }
}

export function deactivate(): void {
  // Nothing to clean up: all disposables are registered on the extension context.
}
