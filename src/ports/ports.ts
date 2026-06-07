/**
 * The ports: every interaction with the outside world, as an interface. The
 * application layer depends only on these, so it is fully exercisable with in-memory
 * fakes (see the tests). VS Code and the OpenAI SDK appear only in `adapters/`.
 */

import {
  type AsyncResultType,
  type Brand,
  type NonEmptyArray,
  type NonEmptyString,
  type OptionType,
  type Redacted,
} from '../fp';
import { type ApiKey } from '../domain/apiKey';
import { type Coverage } from '../domain/coverage';
import { type ModelId } from '../domain/model';
import { type WriteTarget } from '../domain/scope';
import { type CurrentTheme, type ThemeSetting } from '../domain/theme';
import { type Vibe } from '../domain/vibe';
import {
  type ConfigError,
  type OpenAiError,
  type PromptError,
  type Severity,
  type StorageError,
  type UiError,
  type UserMessage,
} from './errors';

/** Milliseconds since an arbitrary epoch — injected so the message throttle is testable. */
export type Millis = Brand<number, 'Millis'>;

export interface Clock {
  readonly now: () => Millis;
}

/** Structured logging. Secrets are `Redacted`, so they render as `<redacted>` even here. */
export interface Logger {
  readonly debug: (message: string, data?: Readonly<Record<string, unknown>>) => void;
  readonly error: (message: string, data?: Readonly<Record<string, unknown>>) => void;
}

export interface SecretStore {
  readonly get: () => AsyncResultType<StorageError, OptionType<string>>;
  readonly set: (key: Redacted<ApiKey>) => AsyncResultType<StorageError, void>;
  readonly clear: () => AsyncResultType<StorageError, void>;
}

export interface GenerationRequest {
  readonly key: Redacted<ApiKey>;
  readonly model: ModelId;
  readonly system: NonEmptyString;
  readonly user: NonEmptyString;
}

export interface OpenAiGateway {
  /** Prove a key works (used after the user enters one). */
  readonly verify: (key: Redacted<ApiKey>) => AsyncResultType<OpenAiError, void>;
  readonly listGptModels: (
    key: Redacted<ApiKey>,
  ) => AsyncResultType<OpenAiError, NonEmptyArray<ModelId>>;
  /** Open a streamed completion; the iterable yields raw content deltas. */
  readonly streamTheme: (
    request: GenerationRequest,
  ) => AsyncResultType<OpenAiError, AsyncIterable<string>>;
}

export interface ConfigStore {
  readonly readCurrentTheme: () => CurrentTheme;
  readonly hasWorkspaceFolders: () => boolean;
  /** Apply one setting, trying the preference order until one target succeeds. */
  readonly applySetting: (
    setting: ThemeSetting,
    preference: NonEmptyArray<WriteTarget>,
  ) => AsyncResultType<ConfigError, WriteTarget>;
  readonly reset: () => AsyncResultType<ConfigError, void>;
}

export interface PromptLibrary {
  readonly systemPrompt: () => AsyncResultType<PromptError, NonEmptyString>;
}

/** Persisted, non-secret preferences (backed by VS Code `globalState`). */
export interface Preferences {
  readonly selectedModel: () => OptionType<ModelId>;
  readonly selectModel: (model: ModelId) => Promise<void>;
  readonly clearModel: () => Promise<void>;
}

// ── UI ────────────────────────────────────────────────────────────────────────

export interface Suggestion {
  readonly label: string;
}

export interface ProgressUpdate {
  readonly message: string;
  readonly percent: OptionType<number>;
}

export interface ProgressReporter {
  readonly report: (update: ProgressUpdate) => void;
}

export interface CancellationSignal {
  readonly isCancelled: () => boolean;
}

export type KeepOrReset = 'keep' | 'reset';

export interface CompletionSummary {
  readonly applied: number;
  readonly coverage: Coverage;
}

export interface Ui {
  /** QuickPick seeded with suggestions; validates input to a `Vibe`, `None` on cancel. */
  readonly pickVibe: (
    suggestions: ReadonlyArray<Suggestion>,
  ) => AsyncResultType<UiError, OptionType<Vibe>>;
  /** Input box for the API key; returns the raw string, `None` on cancel. */
  readonly promptForApiKey: () => AsyncResultType<UiError, OptionType<string>>;
  /** Pick from a non-empty model list, `None` on cancel. */
  readonly pickModel: (
    models: NonEmptyArray<ModelId>,
    current: OptionType<ModelId>,
  ) => AsyncResultType<UiError, OptionType<ModelId>>;
  /** Run a long task inside a cancellable progress notification. */
  readonly runWithProgress: <A>(
    title: string,
    task: (reporter: ProgressReporter, signal: CancellationSignal) => Promise<A>,
  ) => Promise<A>;
  /** On cancel mid-stream: keep the partial theme or reset to the prior state. */
  readonly confirmCancellation: (appliedCount: number) => AsyncResultType<UiError, KeepOrReset>;
  /** On success: acknowledge, offering an immediate reset. */
  readonly announceCompletion: (summary: CompletionSummary) => AsyncResultType<UiError, KeepOrReset>;
  readonly announceReset: () => Promise<void>;
  readonly notify: (message: UserMessage, severity: Severity) => Promise<void>;
}
