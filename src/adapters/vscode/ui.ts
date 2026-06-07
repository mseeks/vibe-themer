import * as vscode from 'vscode';
import { none, type NonEmptyArray, ok, Option, type OptionType, some } from '../../fp';
import { parseApiKey, renderApiKeyError } from '../../domain/apiKey';
import { describeCoverage } from '../../domain/coverage';
import { renderValidationError } from '../../domain/errors';
import { type ModelId, modelText, parseModelId } from '../../domain/model';
import { parseVibe, type Vibe } from '../../domain/vibe';
import {
  type CancellationSignal,
  type CompletionSummary,
  type ProgressReporter,
  type Severity,
  type Suggestion,
  type Ui,
  type UserMessage,
} from '../../ports';

const shuffle = <A>(items: ReadonlyArray<A>): A[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i] as A;
    const b = copy[j] as A;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
};

const messageOptions = (detail: OptionType<string>): vscode.MessageOptions =>
  detail._tag === 'Some' ? { modal: true, detail: detail.value } : { modal: true };

const messageText = (message: UserMessage): string =>
  message.suggestion._tag === 'Some'
    ? `${message.title} — ${message.suggestion.value}`
    : message.title;

export const createUi = (): Ui => ({
  pickVibe: (suggestions: ReadonlyArray<Suggestion>) =>
    new Promise((resolve) => {
      const quickPick = vscode.window.createQuickPick();
      quickPick.title = '🎨 Create New Theme or Modify Current Theme';
      quickPick.placeholder = '✨ Describe any vibe or mood… (modifying needs an existing vibe theme)';

      const sampled = shuffle(suggestions).slice(0, 6);
      const baseItems: vscode.QuickPickItem[] = sampled.map((s) => ({ label: s.label }));
      quickPick.items = baseItems;

      let settled = false;
      const finish = (value: OptionType<Vibe>): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(ok(value));
        quickPick.dispose();
      };

      quickPick.onDidChangeValue((value) => {
        const typed = value.trim();
        if (typed.length > 0 && !sampled.some((s) => s.label === typed)) {
          quickPick.items = [{ label: typed }, ...baseItems];
        } else if (typed.length === 0) {
          quickPick.items = baseItems;
        }
      });

      quickPick.onDidAccept(() => {
        const selected = quickPick.selectedItems[0];
        const raw = selected !== undefined ? selected.label : quickPick.value.trim();
        const parsed = parseVibe(raw);
        if (parsed._tag === 'Err') {
          void vscode.window.showErrorMessage(renderValidationError(parsed.error));
          return;
        }
        finish(some(parsed.value));
      });

      quickPick.onDidHide(() => finish(none));
      quickPick.show();
    }),

  promptForApiKey: async () => {
    const raw = await vscode.window.showInputBox({
      prompt: 'Enter your OpenAI API Key',
      password: true,
      ignoreFocusOut: true,
      placeHolder: 'sk-…',
      validateInput: (value) => {
        const parsed = parseApiKey(value);
        return parsed._tag === 'Err' ? renderApiKeyError(parsed.error) : undefined;
      },
    });
    return ok(Option.fromNullable(raw));
  },

  pickModel: async (models: NonEmptyArray<ModelId>, current: OptionType<ModelId>) => {
    const currentText = current._tag === 'Some' ? modelText(current.value) : undefined;
    const picked = await vscode.window.showQuickPick(models.map(modelText), {
      title: '🤖 Select OpenAI Model for Theme Generation',
      placeHolder:
        currentText !== undefined
          ? `Currently using: ${currentText}`
          : 'Choose a model (a GPT-4 class model is recommended)',
      ignoreFocusOut: true,
    });
    return ok(picked === undefined ? none : parseModelId(picked));
  },

  runWithProgress: <A>(
    title: string,
    task: (reporter: ProgressReporter, signal: CancellationSignal) => Promise<A>,
  ): Promise<A> =>
    Promise.resolve(
      vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title, cancellable: true },
        (progress, token) => {
          let lastPercent = 0;
          const reporter: ProgressReporter = {
            report: (update) => {
              let increment = 0;
              if (update.percent._tag === 'Some') {
                increment = Math.max(0, update.percent.value - lastPercent);
                lastPercent = update.percent.value;
              }
              progress.report({ message: update.message, increment });
            },
          };
          const signal: CancellationSignal = {
            isCancelled: () => token.isCancellationRequested,
          };
          return task(reporter, signal);
        },
      ),
    ),

  confirmCancellation: async (appliedCount: number) => {
    if (appliedCount === 0) {
      await vscode.window.showInformationMessage(
        '🚫 Theme generation cancelled. No changes were made.',
        { modal: true },
      );
      return ok('keep');
    }
    const choice = await vscode.window.showWarningMessage(
      `🛑 Cancelled after applying ${appliedCount} settings. Keep the partial theme or reset?`,
      { modal: true, detail: 'A partial theme may look incomplete — not every element was styled.' },
      'Keep Partial Theme',
      'Reset to Original',
    );
    return ok(choice === 'Reset to Original' ? 'reset' : 'keep');
  },

  announceCompletion: async (summary: CompletionSummary) => {
    const choice = await vscode.window.showInformationMessage(
      `🎨 Theme applied — ${summary.applied} settings.\n\n${describeCoverage(summary.coverage)}`,
      {
        modal: true,
        detail:
          'Applied live as the AI generated each setting. Changing your VS Code theme will not remove these overrides — use "Reset Theme Customizations".',
      },
      'Keep Theme',
      'Reset Theme (Remove All Customizations)',
    );
    return ok(choice === 'Reset Theme (Remove All Customizations)' ? 'reset' : 'keep');
  },

  announceReset: async () => {
    await vscode.window.showInformationMessage(
      '🔄 Theme customizations cleared — your original theme is restored.',
      { modal: true, detail: 'All Vibe Themer color and token overrides have been removed.' },
    );
  },

  notify: async (message: UserMessage, severity: Severity) => {
    const text = messageText(message);
    const options = messageOptions(message.detail);
    if (severity === 'info') {
      await vscode.window.showInformationMessage(text, options);
    } else if (severity === 'warning') {
      await vscode.window.showWarningMessage(text, options);
    } else {
      await vscode.window.showErrorMessage(text, options);
    }
  },
});
