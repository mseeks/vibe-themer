/**
 * The dispatching gateway: a provider-agnostic `ModelGateway` that routes each call
 * to the right per-provider adapter. This is the seam that lets the application stay
 * provider-blind — it only ever holds one `ModelGateway`.
 */

import { type Provider } from '../domain/provider';
import { type ModelGateway, type ProviderAdapter } from '../ports';

export const createModelGateway = (
  adapters: Readonly<Record<Provider, ProviderAdapter>>,
): ModelGateway => ({
  verify: (provider, key) => adapters[provider].verify(key),
  streamTheme: (request) =>
    adapters[request.provider].streamTheme({
      key: request.key,
      model: request.model,
      system: request.system,
      user: request.user,
    }),
});
