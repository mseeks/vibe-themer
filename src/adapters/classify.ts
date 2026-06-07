/**
 * Shared error classification for provider adapters. Both SDKs expose a numeric
 * `.status` and a `.message` on their `APIError`, so the status→`ProviderError`
 * mapping is identical; only the SDK-specific `instanceof` guard differs. Each
 * adapter keeps that two-line guard and delegates here.
 */

import { type ProviderError } from '../ports';

export const classifyByStatus = (
  status: number | undefined,
  message: string,
): ProviderError => {
  if (status === 401 || status === 403) {
    return { _tag: 'AuthFailed' };
  }
  if (status === 429) {
    return { _tag: 'RateLimited' };
  }
  if (status === undefined) {
    return { _tag: 'Network' };
  }
  return { _tag: 'Unexpected', detail: message };
};
