/**
 * `ApiKey` — an OpenAI secret. Two safety properties are baked into the types:
 *
 *  1. Validation is the only constructor (`sk-` prefix, length > 20, matching v1),
 *     so an `ApiKey` is always well-formed.
 *  2. `parseApiKey` hands back a `Redacted<ApiKey>`, never a bare key. The value is
 *     wrapped from birth, and the error variants carry no raw material. This makes
 *     the v1 key-leak (the key reaching `console.error`) unrepresentable.
 */

import { type Brand, matchTag, redact, type Redacted, Result, type ResultType } from '../fp';

export type ApiKey = Brand<string, 'ApiKey'>;

export type ApiKeyError =
  | { readonly _tag: 'KeyEmpty' }
  | { readonly _tag: 'KeyBadPrefix' }
  | { readonly _tag: 'KeyTooShort' };

const MIN_KEY_LENGTH = 20;
const REQUIRED_PREFIX = 'sk-';

export const parseApiKey = (raw: string): ResultType<ApiKeyError, Redacted<ApiKey>> => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return Result.err({ _tag: 'KeyEmpty' });
  }
  if (!trimmed.startsWith(REQUIRED_PREFIX)) {
    return Result.err({ _tag: 'KeyBadPrefix' });
  }
  if (trimmed.length <= MIN_KEY_LENGTH) {
    return Result.err({ _tag: 'KeyTooShort' });
  }
  return Result.ok(redact(trimmed as ApiKey));
};

export const renderApiKeyError = (e: ApiKeyError): string =>
  matchTag(e, {
    KeyEmpty: () => 'An OpenAI API key is required',
    KeyBadPrefix: () => 'OpenAI API keys start with "sk-"',
    KeyTooShort: () => 'That API key looks too short',
  });
