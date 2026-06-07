import type * as vscode from 'vscode';
import { AsyncResult, expose, Option, type Redacted } from '../../fp';
import { type ApiKey } from '../../domain/apiKey';
import { allProviders, type Provider } from '../../domain/provider';
import { type SecretStore, type StorageError } from '../../ports';

const STORAGE_KEY: Readonly<Record<Provider, string>> = {
  openai: 'openaiApiKey',
  anthropic: 'anthropicApiKey',
};

const storageError = (operation: StorageError['operation']): StorageError => ({
  _tag: 'StorageFailure',
  operation,
});

/**
 * Backs each provider's key with VS Code's encrypted `SecretStorage`. `expose`
 * appears exactly once, in `set`, which is the only place the raw key is needed.
 */
export const createSecretStore = (secrets: vscode.SecretStorage): SecretStore => ({
  get: (provider) =>
    AsyncResult.tryCatch(
      async () => Option.fromNullable(await secrets.get(STORAGE_KEY[provider])),
      (): StorageError => storageError('read'),
    ),
  set: (provider, key: Redacted<ApiKey>) =>
    AsyncResult.tryCatch(
      async () => {
        await secrets.store(STORAGE_KEY[provider], expose(key));
      },
      (): StorageError => storageError('write'),
    ),
  clearAll: () =>
    AsyncResult.tryCatch(
      async () => {
        await Promise.all(allProviders.map((p) => secrets.delete(STORAGE_KEY[p])));
      },
      (): StorageError => storageError('clear'),
    ),
});
