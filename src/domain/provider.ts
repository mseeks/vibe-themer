/**
 * `Provider` — which model vendor a model and its API key belong to. Adding a third
 * provider later is a new variant here plus a new adapter; nothing in the pure core
 * changes shape.
 */

export type Provider = 'openai' | 'anthropic';

export const allProviders: ReadonlyArray<Provider> = ['openai', 'anthropic'];

export interface ProviderInfo {
  readonly displayName: string;
  /** The literal prefix a valid key for this provider must start with. */
  readonly keyPrefix: string;
  /** Placeholder shown in the key input box. */
  readonly keyHint: string;
}

export const providerInfo = (provider: Provider): ProviderInfo =>
  provider === 'openai'
    ? { displayName: 'OpenAI', keyPrefix: 'sk-', keyHint: 'sk-…' }
    : { displayName: 'Anthropic', keyPrefix: 'sk-ant-', keyHint: 'sk-ant-…' };
