/**
 * `ApiKey` — a provider secret. Two safety properties are baked into the types:
 *
 *  1. Validation is the only constructor (provider-specific prefix + length), so an
 *     `ApiKey` is always well-formed for its provider. OpenAI keys start `sk-`,
 *     Anthropic keys start `sk-ant-` — and an `sk-ant-` key is rejected for OpenAI.
 *  2. `parseApiKey` hands back a `Redacted<ApiKey>`, never a bare key. The value is
 *     wrapped from birth, and the error variants carry no raw material. This makes
 *     the v1 key-leak (the key reaching `console.error`) unrepresentable.
 */

import { type Brand, matchTag, redact, type Redacted, Result, type ResultType } from '../fp';
import { type Provider, providerInfo } from './provider';

export type ApiKey = Brand<string, 'ApiKey'>;

export type ApiKeyError =
  | { readonly _tag: 'KeyEmpty' }
  | { readonly _tag: 'KeyBadPrefix'; readonly provider: Provider }
  | { readonly _tag: 'KeyTooShort' };

const MIN_KEY_LENGTH = 20;
const OPENAI_FOREIGN_PREFIX = 'sk-ant-';

const hasValidPrefix = (provider: Provider, key: string): boolean => {
  const { keyPrefix } = providerInfo(provider);
  if (!key.startsWith(keyPrefix)) {
    return false;
  }
  // OpenAI's `sk-` also matches Anthropic's `sk-ant-`; exclude it so a key entered
  // under the wrong provider is caught instead of silently misrouted.
  return provider === 'openai' ? !key.startsWith(OPENAI_FOREIGN_PREFIX) : true;
};

export const parseApiKey = (
  provider: Provider,
  raw: string,
): ResultType<ApiKeyError, Redacted<ApiKey>> => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return Result.err({ _tag: 'KeyEmpty' });
  }
  if (!hasValidPrefix(provider, trimmed)) {
    return Result.err({ _tag: 'KeyBadPrefix', provider });
  }
  if (trimmed.length <= MIN_KEY_LENGTH) {
    return Result.err({ _tag: 'KeyTooShort' });
  }
  return Result.ok(redact(trimmed as ApiKey));
};

export const renderApiKeyError = (e: ApiKeyError): string =>
  matchTag(e, {
    KeyEmpty: () => 'An API key is required',
    KeyBadPrefix: ({ provider }) => {
      const { displayName, keyPrefix } = providerInfo(provider);
      return `${displayName} API keys start with "${keyPrefix}"`;
    },
    KeyTooShort: () => 'That API key looks too short',
  });
