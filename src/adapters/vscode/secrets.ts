import type * as vscode from 'vscode';
import { AsyncResult, expose, Option, type Redacted } from '../../fp';
import { type ApiKey } from '../../domain/apiKey';
import { type SecretStore, type StorageError } from '../../ports';

const STORAGE_KEY = 'openaiApiKey';

const storageError = (operation: StorageError['operation']): StorageError => ({
  _tag: 'StorageFailure',
  operation,
});

/**
 * Backs the key with VS Code's encrypted `SecretStorage`. `expose` appears exactly
 * once, in `set`, which is the only place the raw key is needed.
 */
export const createSecretStore = (secrets: vscode.SecretStorage): SecretStore => ({
  get: () =>
    AsyncResult.tryCatch(
      async () => Option.fromNullable(await secrets.get(STORAGE_KEY)),
      (): StorageError => storageError('read'),
    ),
  set: (key: Redacted<ApiKey>) =>
    AsyncResult.tryCatch(
      async () => {
        await secrets.store(STORAGE_KEY, expose(key));
      },
      (): StorageError => storageError('write'),
    ),
  clear: () =>
    AsyncResult.tryCatch(
      async () => {
        await secrets.delete(STORAGE_KEY);
      },
      (): StorageError => storageError('clear'),
    ),
});
