/**
 * Provisioning a provider's API key, as an explicit flow:
 *
 *   stored & well-formed  → trust it (no network round-trip on every command)
 *   stored & malformed    → prompt for a new one
 *   absent                → prompt, verify against the provider, then store
 *
 * The result is a `Redacted<ApiKey>`; the raw key never appears in a return value,
 * a log line, or an error variant. Benign exits (the user dismissing the prompt)
 * render to `None`, so the command layer shows nothing.
 */

import { type AsyncResultType, err, matchTag, none, ok, type OptionType, type Redacted, some } from '../fp';
import { type ApiKey, type ApiKeyError, parseApiKey, renderApiKeyError } from '../domain/apiKey';
import { type Provider } from '../domain/provider';
import {
  type Capabilities,
  type ProviderError,
  renderProviderError,
  renderStorageError,
  type StorageError,
  type UiError,
  type UserMessage,
  userMessage,
} from '../ports';

export type ProvisionError =
  | { readonly _tag: 'Cancelled' }
  | { readonly _tag: 'InvalidKeyFormat'; readonly error: ApiKeyError }
  | { readonly _tag: 'Storage'; readonly error: StorageError }
  | { readonly _tag: 'Provider'; readonly error: ProviderError; readonly provider: Provider }
  | { readonly _tag: 'Ui'; readonly error: UiError };

type ProvisionDeps = Pick<Capabilities, 'secrets' | 'gateway' | 'ui'>;

const promptAndStore = async (
  caps: ProvisionDeps,
  provider: Provider,
): AsyncResultType<ProvisionError, Redacted<ApiKey>> => {
  const entered = await caps.ui.promptForApiKey(provider);
  if (entered._tag === 'Err') {
    return err({ _tag: 'Ui', error: entered.error });
  }
  if (entered.value._tag === 'None') {
    return err({ _tag: 'Cancelled' });
  }

  const parsed = parseApiKey(provider, entered.value.value);
  if (parsed._tag === 'Err') {
    return err({ _tag: 'InvalidKeyFormat', error: parsed.error });
  }
  const key = parsed.value;

  const verified = await caps.gateway.verify(provider, key);
  if (verified._tag === 'Err') {
    return err({ _tag: 'Provider', error: verified.error, provider });
  }

  const saved = await caps.secrets.set(provider, key);
  if (saved._tag === 'Err') {
    return err({ _tag: 'Storage', error: saved.error });
  }
  return ok(key);
};

export const provisionApiKey = async (
  caps: ProvisionDeps,
  provider: Provider,
): AsyncResultType<ProvisionError, Redacted<ApiKey>> => {
  const stored = await caps.secrets.get(provider);
  if (stored._tag === 'Err') {
    return err({ _tag: 'Storage', error: stored.error });
  }

  if (stored.value._tag === 'Some') {
    const parsed = parseApiKey(provider, stored.value.value);
    if (parsed._tag === 'Ok') {
      return ok(parsed.value);
    }
    // A malformed stored key falls through to a fresh prompt.
  }
  return promptAndStore(caps, provider);
};

/** `None` for benign exits (cancellation); `Some` when there is something to tell the user. */
export const renderProvisionError = (e: ProvisionError): OptionType<UserMessage> =>
  matchTag(e, {
    Cancelled: () => none,
    Ui: () => none,
    InvalidKeyFormat: ({ error }) =>
      some(
        userMessage(renderApiKeyError(error), {
          suggestion: 'Run the command again and enter a valid key.',
        }),
      ),
    Storage: ({ error }) => some(renderStorageError(error)),
    Provider: ({ error, provider }) => some(renderProviderError(error, provider)),
  });
