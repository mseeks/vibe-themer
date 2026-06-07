import { promises as fs } from 'fs';
import * as path from 'path';
import type * as vscode from 'vscode';
import { type AsyncResultType, err, isNonEmptyString, type NonEmptyString, ok } from '../../fp';
import { type PromptError, type PromptLibrary } from '../../ports';

const PROMPT_RELATIVE_PATH = path.join('prompts', 'streamingThemePrompt.txt');

/** Loads the system prompt shipped with the extension via the resource-safe path API. */
export const createPromptLibrary = (context: vscode.ExtensionContext): PromptLibrary => ({
  systemPrompt: async (): AsyncResultType<PromptError, NonEmptyString> => {
    try {
      const absolute = context.asAbsolutePath(PROMPT_RELATIVE_PATH);
      const content = await fs.readFile(absolute, 'utf8');
      return isNonEmptyString(content) ? ok(content) : err({ _tag: 'PromptEmpty' });
    } catch {
      return err({ _tag: 'PromptUnavailable' });
    }
  },
});
