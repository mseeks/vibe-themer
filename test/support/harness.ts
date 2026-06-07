/**
 * In-memory fakes for every port, assembled into `Capabilities`. Because the whole
 * application core depends only on ports, this lets us drive the full Change Theme
 * flow — streaming, live application, cancellation, error tolerance, and now
 * multi-provider routing — with no VS Code and no network, then inspect what happened.
 */

import { expose, none, type NonEmptyString, type OptionType, ok, Option, some } from '../../src/fp';
import { toApplication } from '../../src/domain/color';
import { fontStyleText } from '../../src/domain/fontStyle';
import { type Model, modelText } from '../../src/domain/model';
import { type Provider } from '../../src/domain/provider';
import { selectorText } from '../../src/domain/selector';
import { type WriteTarget } from '../../src/domain/scope';
import { type CurrentTheme, type ThemeSetting } from '../../src/domain/theme';
import { tokenScopeText } from '../../src/domain/tokenScope';
import { parseVibe } from '../../src/domain/vibe';
import {
  type Capabilities,
  type KeepOrReset,
  type Millis,
  type ProviderError,
  type Severity,
} from '../../src/ports';

export interface HarnessOptions {
  /** Pre-stored key, kept under the selected model's provider (default OpenAI). */
  readonly storedKey?: string;
  readonly promptKey?: string;
  readonly vibe?: string;
  /** Override the chosen model; defaults to none → the app uses DEFAULT_MODEL. */
  readonly selectedModel?: Model;
  readonly streamText?: string;
  /** Fail the stream at *open* time (streamTheme returns Err). */
  readonly streamError?: ProviderError;
  /** Fail *mid-stream*: yield this many chunks, then throw `streamThrowError`. */
  readonly streamThrowAfter?: number;
  readonly streamThrowError?: ProviderError;
  readonly chunkSize?: number;
  readonly cancelAfterReports?: number;
  readonly cancellationChoice?: KeepOrReset;
  readonly completionChoice?: KeepOrReset;
  readonly workspaceFolders?: boolean;
  readonly currentTheme?: CurrentTheme;
  /** Make every settings write fail (simulates an unwritable settings.json). */
  readonly failApply?: boolean;
  readonly applyTo?: WriteTarget;
}

export interface TokenRule {
  readonly scope: string;
  readonly settings: Record<string, unknown>;
}

export interface Captured {
  readonly logs: Array<{ level: string; message: string; data?: Readonly<Record<string, unknown>> }>;
  readonly notifications: Array<{ severity: Severity; title: string }>;
  readonly keySetProviders: Provider[];
  keySet: boolean;
  keyCleared: boolean;
  resets: number;
  streamUserPrompt: string;
  /** What the gateway was actually asked to stream — proves provider/model routing. */
  streamProvider: Provider | undefined;
  streamModel: string;
}

export interface Harness {
  readonly caps: Capabilities;
  readonly colors: Map<string, string>;
  readonly tokenRules: TokenRule[];
  readonly captured: Captured;
}

const emptyTheme: CurrentTheme = {
  global: { colors: {}, tokens: {} },
  workspace: { colors: {}, tokens: {} },
};

const chunk = (text: string, size: number): string[] => {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.slice(i, i + size));
  }
  return out;
};

async function* fromChunks(parts: ReadonlyArray<string>): AsyncIterable<string> {
  for (const part of parts) {
    yield part;
  }
}

// Mimics a real adapter's toContentStream after `throwAfter` chunks: it throws a
// classified ProviderError, exactly as the SDK path does on a mid-stream failure.
async function* fromChunksThenThrow(
  parts: ReadonlyArray<string>,
  throwAfter: number,
  error: ProviderError,
): AsyncIterable<string> {
  let yielded = 0;
  for (const part of parts) {
    if (yielded >= throwAfter) {
      throw error;
    }
    yield part;
    yielded += 1;
  }
  throw error;
}

export const harness = (options: HarnessOptions = {}): Harness => {
  const colors = new Map<string, string>();
  const tokenRules: TokenRule[] = [];
  const captured: Captured = {
    logs: [],
    notifications: [],
    keySetProviders: [],
    keySet: false,
    keyCleared: false,
    resets: 0,
    streamUserPrompt: '',
    streamProvider: undefined,
    streamModel: '',
  };

  const activeProvider: Provider = options.selectedModel?.provider ?? 'openai';
  const keys = new Map<Provider, string>();
  if (options.storedKey !== undefined) {
    keys.set(activeProvider, options.storedKey);
  }
  let selectedModel: OptionType<Model> =
    options.selectedModel !== undefined ? some(options.selectedModel) : none;
  let clockValue = 0;

  const applyToState = (setting: ThemeSetting): void => {
    if (setting._tag === 'SelectorSetting') {
      const application = toApplication(setting.color);
      const key = selectorText(setting.selector);
      if (application._tag === 'Delete') {
        colors.delete(key);
      } else {
        colors.set(key, application.value);
      }
    } else {
      const scope = tokenScopeText(setting.scope);
      const index = tokenRules.findIndex((r) => r.scope === scope);
      if (index >= 0) {
        tokenRules.splice(index, 1);
      }
      const application = toApplication(setting.color);
      if (application._tag !== 'Delete') {
        tokenRules.push({
          scope,
          settings: {
            foreground: application.value,
            ...(setting.fontStyle._tag === 'Some'
              ? { fontStyle: fontStyleText(setting.fontStyle.value) }
              : {}),
          },
        });
      }
    }
  };

  const caps: Capabilities = {
    secrets: {
      get: async (provider) => ok(Option.fromNullable(keys.get(provider))),
      set: async (provider, key) => {
        keys.set(provider, expose(key));
        captured.keySet = true;
        captured.keySetProviders.push(provider);
        return ok(undefined);
      },
      clearAll: async () => {
        keys.clear();
        captured.keyCleared = true;
        return ok(undefined);
      },
    },

    gateway: {
      verify: async () => ok(undefined),
      streamTheme: async (request) => {
        captured.streamUserPrompt = request.user;
        captured.streamProvider = request.provider;
        captured.streamModel = modelText(request.model);
        if (options.streamError !== undefined) {
          return { _tag: 'Err', error: options.streamError };
        }
        const parts = chunk(options.streamText ?? '', options.chunkSize ?? 7);
        if (options.streamThrowError !== undefined) {
          return ok(
            fromChunksThenThrow(parts, options.streamThrowAfter ?? 1, options.streamThrowError),
          );
        }
        return ok(fromChunks(parts));
      },
    },

    config: {
      readCurrentTheme: () => options.currentTheme ?? emptyTheme,
      hasWorkspaceFolders: () => options.workspaceFolders ?? false,
      applyTo: () => options.applyTo ?? 'global',
      applySetting: async (setting, _preference) => {
        if (options.failApply === true) {
          return { _tag: 'Err', error: { _tag: 'AllTargetsFailed' } };
        }
        applyToState(setting);
        return ok('global');
      },
      reset: async () => {
        captured.resets += 1;
        colors.clear();
        tokenRules.length = 0;
        return ok(undefined);
      },
    },

    prompts: {
      systemPrompt: async () => ok('SYSTEM PROMPT' as NonEmptyString),
    },

    preferences: {
      selectedModel: () => selectedModel,
      selectModel: async (model) => {
        selectedModel = some(model);
      },
      clearModel: async () => {
        selectedModel = none;
      },
    },

    ui: {
      pickVibe: async () => {
        if (options.vibe === undefined) {
          return ok(none);
        }
        const parsed = parseVibe(options.vibe);
        return ok(parsed._tag === 'Ok' ? some(parsed.value) : none);
      },
      promptForApiKey: async (_provider) => ok(Option.fromNullable(options.promptKey)),
      pickModel: async () => ok(none),
      runWithProgress: async (_title, task) => {
        let reports = 0;
        let cancelled = false;
        const reporter = {
          report: () => {
            reports += 1;
            if (options.cancelAfterReports !== undefined && reports >= options.cancelAfterReports) {
              cancelled = true;
            }
          },
        };
        const signal = { isCancelled: () => cancelled };
        return task(reporter, signal);
      },
      confirmCancellation: async () => ok(options.cancellationChoice ?? 'keep'),
      announceCompletion: async () => ok(options.completionChoice ?? 'keep'),
      announceReset: async () => {
        /* recorded via config.reset */
      },
      notify: async (message, severity) => {
        captured.notifications.push({ severity, title: message.title });
      },
    },

    clock: {
      now: (): Millis => {
        clockValue += 1000;
        return clockValue as Millis;
      },
    },

    logger: {
      debug: (message, data) => captured.logs.push({ level: 'debug', message, ...(data ? { data } : {}) }),
      error: (message, data) => captured.logs.push({ level: 'error', message, ...(data ? { data } : {}) }),
    },
  };

  return { caps, colors, tokenRules, captured };
};
