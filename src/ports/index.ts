export * from './errors';
export * from './ports';

import {
  type Clock,
  type ConfigStore,
  type Logger,
  type OpenAiGateway,
  type Preferences,
  type PromptLibrary,
  type SecretStore,
  type Ui,
} from './ports';

/**
 * The full set of capabilities the application needs, wired once at the composition
 * root and threaded into use cases. Passing one record keeps signatures small and
 * makes the dependency surface of every use case explicit.
 */
export interface Capabilities {
  readonly secrets: SecretStore;
  readonly openai: OpenAiGateway;
  readonly config: ConfigStore;
  readonly prompts: PromptLibrary;
  readonly preferences: Preferences;
  readonly ui: Ui;
  readonly clock: Clock;
  readonly logger: Logger;
}
