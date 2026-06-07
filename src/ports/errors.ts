/**
 * Error vocabularies for the side-effecting boundary, plus their translation into
 * user-facing copy. Each port speaks a small, closed error union; the `render*`
 * functions are the single place those become `UserMessage`s, so wording lives in
 * one spot and adding a variant forces an explicit copy decision (exhaustive match).
 */

import { matchTag, none, type OptionType, some } from '../fp';
import { type Provider, providerInfo } from '../domain/provider';
import { type WriteTarget } from '../domain/scope';

export type Severity = 'info' | 'warning' | 'error';

export interface UserMessage {
  readonly title: string;
  readonly detail: OptionType<string>;
  readonly suggestion: OptionType<string>;
}

export const userMessage = (
  title: string,
  options: { readonly suggestion?: string; readonly detail?: string } = {},
): UserMessage => ({
  title,
  detail: options.detail === undefined ? none : some(options.detail),
  suggestion: options.suggestion === undefined ? none : some(options.suggestion),
});

// ── Port error unions ─────────────────────────────────────────────────────────

export type StorageError = {
  readonly _tag: 'StorageFailure';
  readonly operation: 'read' | 'write' | 'clear';
};

export type PromptError = { readonly _tag: 'PromptUnavailable' } | { readonly _tag: 'PromptEmpty' };

export type ProviderError =
  | { readonly _tag: 'AuthFailed' }
  | { readonly _tag: 'RateLimited' }
  | { readonly _tag: 'Network' }
  | { readonly _tag: 'Unexpected'; readonly detail: string };

const PROVIDER_ERROR_TAGS: ReadonlyArray<ProviderError['_tag']> = [
  'AuthFailed',
  'RateLimited',
  'Network',
  'Unexpected',
];

/**
 * A stream can only fail by *throwing*, so a mid-stream provider failure reaches the
 * consumer as a thrown value. Adapters classify it to a `ProviderError` before
 * re-throwing; this guard lets the application turn that thrown value back into a
 * typed error instead of letting it escape as an unhandled rejection.
 */
export const isProviderError = (e: unknown): e is ProviderError =>
  typeof e === 'object' &&
  e !== null &&
  '_tag' in e &&
  (PROVIDER_ERROR_TAGS as ReadonlyArray<string>).includes((e as { readonly _tag: string })._tag);

export type ConfigError =
  | { readonly _tag: 'WriteFailed'; readonly target: WriteTarget }
  | { readonly _tag: 'AllTargetsFailed' };

export type UiError = { readonly _tag: 'UiFailure' };

// ── Rendering ─────────────────────────────────────────────────────────────────

// `provider`, when known, names which vendor failed — keys are stored per provider,
// so "Anthropic rejected the API key" is actionable where "the provider" is not.
export const renderProviderError = (e: ProviderError, provider?: Provider): UserMessage => {
  const name = provider !== undefined ? providerInfo(provider).displayName : undefined;
  return matchTag(e, {
    AuthFailed: () =>
      userMessage(`🔑 ${name ?? 'The provider'} rejected the API key`, {
        suggestion: 'Run "Clear API Keys", then enter a valid key and check your account access.',
      }),
    RateLimited: () =>
      userMessage(`🔑 ${name ?? 'Provider'} rate limit or quota reached`, {
        suggestion: 'Check your plan and usage on the provider dashboard, then try again.',
      }),
    Network: () =>
      userMessage(`🌐 Could not reach ${name ?? 'the model provider'}`, {
        suggestion: 'Check your internet connection and try again.',
      }),
    Unexpected: ({ detail }) =>
      userMessage('❌ The model request failed', { detail, suggestion: 'Please try again.' }),
  });
};

export const renderPromptError = (e: PromptError): UserMessage =>
  matchTag(e, {
    PromptUnavailable: () =>
      userMessage('❌ Could not load the theme prompt', {
        suggestion: 'Try reinstalling Vibe Themer.',
      }),
    PromptEmpty: () =>
      userMessage('❌ The theme prompt is empty', {
        suggestion: 'Try reinstalling Vibe Themer.',
      }),
  });

export const renderConfigError = (e: ConfigError): UserMessage =>
  matchTag(e, {
    WriteFailed: ({ target }) =>
      userMessage(`❌ Could not write theme to ${target} settings`, {
        suggestion: 'Check VS Code permissions and try restarting the editor.',
      }),
    AllTargetsFailed: () =>
      userMessage('❌ Could not apply the theme to any settings scope', {
        suggestion: 'Check VS Code permissions and try restarting the editor.',
      }),
  });

export const renderStorageError = (e: StorageError): UserMessage =>
  userMessage(`❌ Secure storage ${e.operation} failed`, {
    suggestion: 'Try restarting VS Code.',
  });

export const renderUiError = (_e: UiError): UserMessage =>
  userMessage('❌ A UI operation failed unexpectedly', { suggestion: 'Please try again.' });
