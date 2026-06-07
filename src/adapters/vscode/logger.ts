import type * as vscode from 'vscode';
import { type Logger } from '../../ports';

const format = (level: string, message: string, data?: Readonly<Record<string, unknown>>): string =>
  data === undefined ? `[${level}] ${message}` : `[${level}] ${message} ${JSON.stringify(data)}`;

/**
 * Logs to a VS Code output channel. Secrets passed in `data` are `Redacted`, whose
 * `toJSON` returns `<redacted>`, so `JSON.stringify` here can never spill a key.
 */
export const createLogger = (channel: vscode.OutputChannel): Logger => ({
  debug: (message, data) => channel.appendLine(format('debug', message, data)),
  error: (message, data) => channel.appendLine(format('error', message, data)),
});
