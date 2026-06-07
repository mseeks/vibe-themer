/**
 * The Change Theme use case: provision a key, get a vibe, open the model stream,
 * and apply each directive to the editor as it arrives.
 *
 * The orchestration lives here; every *decision* is delegated to a pure function
 * (`parseLine`, `progressPercent`, `shouldShowMessage`, `coverage`) or a domain
 * constructor, and every *effect* goes through a port. That split is what makes the
 * whole flow testable with in-memory fakes — see `test/generateTheme.test.ts`.
 *
 * Benign exits (user dismisses the key prompt or the vibe picker) are *outcomes*,
 * not errors. Genuine failures (prompt missing, OpenAI down, too many malformed
 * lines) are errors.
 */

import {
  type AsyncResultType,
  err,
  matchTag,
  type NonEmptyArray,
  type NonEmptyString,
  none,
  ok,
  Option,
  type Redacted,
  type ResultType,
  some,
} from '../fp';
import { type ApiKey } from '../domain/apiKey';
import { coverage } from '../domain/coverage';
import { type StreamingDirective } from '../domain/directive';
import { DEFAULT_MODEL, type Model, modelText } from '../domain/model';
import { type Provider, providerInfo } from '../domain/provider';
import { type WriteTarget, writePreference } from '../domain/scope';
import { type ThemeSetting } from '../domain/theme';
import { type Vibe } from '../domain/vibe';
import { parseLine, renderParseError } from '../protocol/streamingParser';
import {
  type CancellationSignal,
  type Capabilities,
  type ConfigError,
  isProviderError,
  type KeepOrReset,
  type Millis,
  type ProgressReporter,
  type PromptError,
  type ProviderError,
  renderConfigError,
  renderProviderError,
  renderPromptError,
  renderUiError,
  type UiError,
  type UserMessage,
  userMessage,
} from '../ports';
import { buildUserPrompt } from './context';
import { markShown, neverShown, progressPercent, shouldShowMessage } from './progress';
import { type ProvisionError, provisionApiKey, renderProvisionError } from './provisionApiKey';
import { curatedSuggestions } from './suggestions';

// Tolerance for malformed *model output* (a parse-quality signal).
const MAX_RECOVERABLE_ERRORS = 5;
// Tolerance for *settings-write* failures (an environment/permissions signal,
// kept separate so an IO problem isn't misreported as bad model output).
const MAX_WRITE_ERRORS = 5;
const DEFAULT_EXPECTED_SETTINGS = 120;
const INITIAL_MESSAGE = '🤖 AI analyzing your vibe...';
const PROGRESS_TITLE = 'Vibe Themer';

export type GenerationOutcome =
  | { readonly _tag: 'NoKey' }
  | { readonly _tag: 'NoVibe' }
  | { readonly _tag: 'Completed'; readonly applied: number }
  | { readonly _tag: 'CancelledKept'; readonly applied: number }
  | { readonly _tag: 'CancelledReset' };

export type GenerationError =
  | { readonly _tag: 'Provision'; readonly error: ProvisionError }
  | { readonly _tag: 'Ui'; readonly error: UiError }
  | { readonly _tag: 'Prompt'; readonly error: PromptError }
  | { readonly _tag: 'Provider'; readonly error: ProviderError; readonly provider: Provider }
  | {
      readonly _tag: 'StreamInterrupted';
      readonly applied: number;
      readonly error: ProviderError;
      readonly provider: Provider;
    }
  | { readonly _tag: 'WriteAborted'; readonly applied: number; readonly error: ConfigError }
  | { readonly _tag: 'Aborted'; readonly applied: number; readonly lastError: string };

type ApplyStatus = 'ok' | 'error';

type ConsumeOutcome =
  | { readonly _tag: 'Completed'; readonly applied: number }
  | { readonly _tag: 'Cancelled'; readonly applied: number }
  | { readonly _tag: 'StreamFailed'; readonly applied: number; readonly error: ProviderError }
  | { readonly _tag: 'WriteFailed'; readonly applied: number; readonly error: ConfigError }
  | { readonly _tag: 'Aborted'; readonly applied: number; readonly lastError: string };

// ── The streaming consume loop ─────────────────────────────────────────────────

const consumeStream = async (
  caps: Capabilities,
  stream: AsyncIterable<string>,
  reporter: ProgressReporter,
  signal: CancellationSignal,
  preference: NonEmptyArray<WriteTarget>,
): Promise<ConsumeOutcome> => {
  let buffer = '';
  let applied = 0;
  let expected = DEFAULT_EXPECTED_SETTINGS;
  let parseErrors = 0;
  let writeErrors = 0;
  let lastParseError = '';
  let lastConfigError: ConfigError | undefined;
  let currentMessage = INITIAL_MESSAGE;
  let lastMessageAt = neverShown;

  const reportProgress = (): void =>
    reporter.report({ message: currentMessage, percent: some(progressPercent(applied, expected)) });

  const applySetting = async (setting: ThemeSetting): Promise<ApplyStatus> => {
    const result = await caps.config.applySetting(setting, preference);
    if (result._tag === 'Ok') {
      applied += 1;
      reportProgress();
      return 'ok';
    }
    // A write failure is environmental, not a model-output problem — track it on
    // its own budget and log it, rather than spending the malformed-line tolerance.
    writeErrors += 1;
    lastConfigError = result.error;
    caps.logger.debug('apply setting failed', { error: renderConfigError(result.error).title });
    return 'error';
  };

  const applyDirective = (directive: StreamingDirective): Promise<ApplyStatus> =>
    matchTag(directive, {
      Count: async ({ total }): Promise<ApplyStatus> => {
        expected = total;
        currentMessage = `🎯 Planning ${total} theme settings...`;
        reportProgress();
        return 'ok';
      },
      Message: async ({ text }): Promise<ApplyStatus> => {
        const now: Millis = caps.clock.now();
        if (shouldShowMessage(lastMessageAt, now)) {
          currentMessage = `✨ ${text}`;
          lastMessageAt = markShown(now);
          reporter.report({ message: currentMessage, percent: none });
        }
        return 'ok';
      },
      Selector: ({ selector, color }): Promise<ApplyStatus> =>
        applySetting({ _tag: 'SelectorSetting', selector, color }),
      Token: ({ scope, color, fontStyle }): Promise<ApplyStatus> =>
        applySetting({ _tag: 'TokenSetting', scope, color, fontStyle }),
    });

  const handleLine = async (line: string): Promise<ConsumeOutcome | null> => {
    if (line.trim() === '') {
      return null;
    }
    const parsed = parseLine(line);
    if (parsed._tag === 'Ok') {
      // Write failures are counted inside applySetting, on their own budget.
      await applyDirective(parsed.value);
    } else {
      parseErrors += 1;
      lastParseError = renderParseError(parsed.error);
      caps.logger.debug('directive parse failed', { line, error: lastParseError });
    }
    if (parseErrors >= MAX_RECOVERABLE_ERRORS) {
      return { _tag: 'Aborted', applied, lastError: lastParseError };
    }
    if (writeErrors >= MAX_WRITE_ERRORS && lastConfigError !== undefined) {
      return { _tag: 'WriteFailed', applied, error: lastConfigError };
    }
    return null;
  };

  try {
    for await (const chunk of stream) {
      if (signal.isCancelled()) {
        break;
      }
      buffer += chunk;
      const segments = buffer.split('\n');
      buffer = segments.pop() ?? '';
      for (const line of segments) {
        if (signal.isCancelled()) {
          break;
        }
        const aborted = await handleLine(line);
        if (aborted !== null) {
          return aborted;
        }
      }
    }
  } catch (e) {
    // The stream threw after opening (provider error mid-generation). Adapters
    // re-throw a classified ProviderError; anything else becomes Unexpected.
    const error: ProviderError = isProviderError(e) ? e : { _tag: 'Unexpected', detail: String(e) };
    return { _tag: 'StreamFailed', applied, error };
  }

  // Flush a trailing partial line on clean completion (v1 parity); ignore its errors.
  if (!signal.isCancelled() && buffer.trim() !== '') {
    const parsed = parseLine(buffer);
    if (parsed._tag === 'Ok') {
      await applyDirective(parsed.value);
    }
  }

  return signal.isCancelled() ? { _tag: 'Cancelled', applied } : { _tag: 'Completed', applied };
};

// ── Finalization: keep/reset modals after the progress notification closes ─────

const decideKeepOrReset = (result: ResultType<UiError, KeepOrReset>): KeepOrReset =>
  result._tag === 'Ok' ? result.value : 'keep';

const finalize = (
  caps: Capabilities,
  consumed: ConsumeOutcome,
  provider: Provider,
): AsyncResultType<GenerationError, GenerationOutcome> =>
  matchTag(consumed, {
    Aborted: ({ applied, lastError }): AsyncResultType<GenerationError, GenerationOutcome> =>
      Promise.resolve(err({ _tag: 'Aborted', applied, lastError })),

    StreamFailed: ({ applied, error }): AsyncResultType<GenerationError, GenerationOutcome> =>
      Promise.resolve(err({ _tag: 'StreamInterrupted', applied, error, provider })),

    WriteFailed: ({ applied, error }): AsyncResultType<GenerationError, GenerationOutcome> =>
      Promise.resolve(err({ _tag: 'WriteAborted', applied, error })),

    Completed: async ({ applied }): AsyncResultType<GenerationError, GenerationOutcome> => {
      const choice = await caps.ui.announceCompletion({
        applied,
        coverage: coverage(applied, DEFAULT_EXPECTED_SETTINGS),
      });
      if (decideKeepOrReset(choice) === 'reset') {
        await resetQuietly(caps);
      }
      return ok({ _tag: 'Completed', applied });
    },

    Cancelled: async ({ applied }): AsyncResultType<GenerationError, GenerationOutcome> => {
      const choice = await caps.ui.confirmCancellation(applied);
      if (decideKeepOrReset(choice) === 'reset') {
        await resetQuietly(caps);
        return ok({ _tag: 'CancelledReset' });
      }
      return ok({ _tag: 'CancelledKept', applied });
    },
  });

const resetQuietly = async (caps: Capabilities): Promise<void> => {
  const result = await caps.config.reset();
  if (result._tag === 'Err') {
    caps.logger.error('reset after generation failed', {
      error: renderConfigError(result.error).title,
    });
  }
};

// ── The use case ───────────────────────────────────────────────────────────────

const runGeneration = async (
  caps: Capabilities,
  model: Model,
  key: Redacted<ApiKey>,
  vibe: Vibe,
  system: NonEmptyString,
): AsyncResultType<GenerationError, GenerationOutcome> => {
  const current = caps.config.readCurrentTheme();
  const user = buildUserPrompt(current, vibe);
  const preference = writePreference(caps.config.applyTo(), caps.config.hasWorkspaceFolders());

  const streamResult = await caps.gateway.streamTheme({
    provider: model.provider,
    key,
    model: model.id,
    system,
    user,
  });
  if (streamResult._tag === 'Err') {
    return err({ _tag: 'Provider', error: streamResult.error, provider: model.provider });
  }

  const consumed = await caps.ui.runWithProgress(PROGRESS_TITLE, (reporter, signal) => {
    reporter.report({ message: INITIAL_MESSAGE, percent: none });
    return consumeStream(caps, streamResult.value, reporter, signal, preference);
  });

  return finalize(caps, consumed, model.provider);
};

export const generateTheme = async (
  caps: Capabilities,
): AsyncResultType<GenerationError, GenerationOutcome> => {
  const model = Option.getOrElse(() => DEFAULT_MODEL)(caps.preferences.selectedModel());
  const modelLabel = `${providerInfo(model.provider).displayName} · ${modelText(model.id)}`;

  // Ask for the vibe first: the user commits to an action (and sees the active
  // model) before being asked for a credential. Provisioning the key — which does a
  // verify round-trip — only happens once there's a vibe to act on.
  const vibeResult = await caps.ui.pickVibe(curatedSuggestions, modelLabel);
  if (vibeResult._tag === 'Err') {
    return err({ _tag: 'Ui', error: vibeResult.error });
  }
  if (vibeResult.value._tag === 'None') {
    return ok({ _tag: 'NoVibe' });
  }

  const keyResult = await provisionApiKey(caps, model.provider);
  if (keyResult._tag === 'Err') {
    return keyResult.error._tag === 'Cancelled'
      ? ok({ _tag: 'NoKey' })
      : err({ _tag: 'Provision', error: keyResult.error });
  }

  const promptResult = await caps.prompts.systemPrompt();
  if (promptResult._tag === 'Err') {
    return err({ _tag: 'Prompt', error: promptResult.error });
  }

  return runGeneration(caps, model, keyResult.value, vibeResult.value.value, promptResult.value);
};

export const renderGenerationError = (e: GenerationError): Option.Option<UserMessage> =>
  matchTag(e, {
    Provision: ({ error }) => renderProvisionError(error),
    Ui: ({ error }) => some(renderUiError(error)),
    Prompt: ({ error }) => some(renderPromptError(error)),
    Provider: ({ error, provider }) => some(renderProviderError(error, provider)),
    StreamInterrupted: ({ applied, error, provider }) =>
      some(
        userMessage(renderProviderError(error, provider).title, {
          detail: `Generation stopped after applying ${applied} settings.`,
          suggestion: 'Try again, or run "Reset Theme Customizations" to start fresh.',
        }),
      ),
    WriteAborted: ({ applied, error }) =>
      some(
        userMessage(renderConfigError(error).title, {
          detail: `Stopped after applying ${applied} settings — the editor kept refusing writes.`,
          suggestion: 'Check VS Code permissions and try restarting the editor.',
        }),
      ),
    Aborted: ({ applied, lastError }) =>
      some(
        userMessage('⚠️ Theme generation was interrupted', {
          detail: `${applied} settings were applied before too many errors (last: ${lastError}).`,
          suggestion: 'Try again, or run "Reset Theme Customizations" to start fresh.',
        }),
      ),
  });
