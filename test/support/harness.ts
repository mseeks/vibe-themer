/**
 * In-memory fakes for every port, assembled into `Capabilities`. Because the whole
 * application core depends only on ports, this lets us drive the full Change Theme
 * flow — streaming, live application, cancellation, error tolerance — with no VS
 * Code and no network, and then inspect exactly what happened.
 */

import {
  expose,
  none,
  type NonEmptyArray,
  type NonEmptyString,
  type OptionType,
  ok,
  Option,
  some,
} from '../../src/fp';
import { toApplication } from '../../src/domain/color';
import { fontStyleText } from '../../src/domain/fontStyle';
import { type ModelId } from '../../src/domain/model';
import { selectorText } from '../../src/domain/selector';
import { type CurrentTheme, type ThemeSetting } from '../../src/domain/theme';
import { tokenScopeText } from '../../src/domain/tokenScope';
import { parseVibe } from '../../src/domain/vibe';
import {
  type Capabilities,
  type KeepOrReset,
  type Millis,
  type OpenAiError,
  type Severity,
} from '../../src/ports';

export interface HarnessOptions {
  readonly storedKey?: string;
  readonly promptKey?: string;
  readonly vibe?: string;
  readonly streamText?: string;
  readonly streamError?: OpenAiError;
  readonly chunkSize?: number;
  readonly cancelAfterReports?: number;
  readonly cancellationChoice?: KeepOrReset;
  readonly completionChoice?: KeepOrReset;
  readonly workspaceFolders?: boolean;
  readonly currentTheme?: CurrentTheme;
}

export interface TokenRule {
  readonly scope: string;
  readonly settings: Record<string, unknown>;
}

export interface Captured {
  readonly logs: Array<{ level: string; message: string; data?: Readonly<Record<string, unknown>> }>;
  readonly notifications: Array<{ severity: Severity; title: string }>;
  keySet: boolean;
  keyCleared: boolean;
  resets: number;
  streamUserPrompt: string;
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

export const harness = (options: HarnessOptions = {}): Harness => {
  const colors = new Map<string, string>();
  const tokenRules: TokenRule[] = [];
  const captured: Captured = {
    logs: [],
    notifications: [],
    keySet: false,
    keyCleared: false,
    resets: 0,
    streamUserPrompt: '',
  };

  let storedKey = options.storedKey;
  let selectedModel: OptionType<ModelId> = none;
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
      get: async () => ok(Option.fromNullable(storedKey)),
      set: async (key) => {
        storedKey = expose(key);
        captured.keySet = true;
        return ok(undefined);
      },
      clear: async () => {
        storedKey = undefined;
        captured.keyCleared = true;
        return ok(undefined);
      },
    },

    openai: {
      verify: async () => ok(undefined),
      listGptModels: async () => {
        const models: NonEmptyArray<ModelId> = ['gpt-4.1' as ModelId];
        return ok(models);
      },
      streamTheme: async (request) => {
        captured.streamUserPrompt = request.user;
        return options.streamError !== undefined
          ? { _tag: 'Err', error: options.streamError }
          : ok(fromChunks(chunk(options.streamText ?? '', options.chunkSize ?? 7)));
      },
    },

    config: {
      readCurrentTheme: () => options.currentTheme ?? emptyTheme,
      hasWorkspaceFolders: () => options.workspaceFolders ?? false,
      applySetting: async (setting, _preference) => {
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
      promptForApiKey: async () => ok(Option.fromNullable(options.promptKey)),
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
