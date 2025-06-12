/**
 * Theme prompt picker utilities.
 * Pure functional approach to creating VS Code QuickPick interfaces.
 * Isolated from business logic for clean separation of concerns.
 */

import * as vscode from 'vscode';
import { ThemePromptSuggestion } from '../types/theme.js';
import { CURATED_SUGGESTIONS, getRandomCuratedSuggestions } from '../core/suggestionCore.js';

/**
 * Creates a QuickPick item from a theme suggestion.
 * Pure function that transforms domain objects to VS Code UI objects.
 * Keeps it clean - just the vibe, no clutter.
 */
const createQuickPickItem = (suggestion: ThemePromptSuggestion): vscode.QuickPickItem => ({
    label: suggestion.label
    // No description, no detail - just the pure creative prompt
});

/**
 * Validates a theme prompt input.
 * Pure function that applies business rules for theme descriptions.
 */
const validateThemePrompt = (prompt: string): string | null => {
    const trimmed = prompt.trim();

    if (!trimmed) {
        return 'Please enter a theme description';
    }

    if (trimmed.length < 3) {
        return 'Please provide a more detailed description for better results';
    }

    return null;
};

/**
 * Shows a theme prompt picker with curated suggestions.
 * Users can select a suggestion or type their own custom prompt.
 * Returns the selected/typed prompt or undefined if cancelled.
 */
export const showThemePromptPicker = async (): Promise<string | undefined> => {
    const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();

    // Configure the picker
    quickPick.title = '🎨 Create New Theme or Modify Current Theme';
    quickPick.placeholder = '✨ Describe any vibe or mood... (modification requires existing vibe theme)';
    quickPick.canSelectMany = false;

    // Show curated suggestions as starting options
    const suggestions = getRandomCuratedSuggestions(6);
    quickPick.items = suggestions.map(createQuickPickItem);

    return new Promise<string | undefined>((resolve) => {
        let resolved = false;

        // Handle item selection
        quickPick.onDidAccept(() => {
            if (resolved) {
                return;
            }

            const selectedItem = quickPick.selectedItems[0];
            const promptValue = selectedItem ? selectedItem.label : quickPick.value.trim();

            // Validate the prompt
            const validationError = validateThemePrompt(promptValue);
            if (validationError) {
                vscode.window.showErrorMessage(validationError);
                return; // Don't resolve, let user try again
            }

            resolved = true;
            resolve(promptValue);
            quickPick.dispose();
        });

        // Handle cancellation
        quickPick.onDidHide(() => {
            if (resolved) {
                return;
            }
            resolved = true;
            resolve(undefined);
            quickPick.dispose();
        });

        // Handle input changes - allow free typing
        quickPick.onDidChangeValue((value) => {
            const trimmedValue = value.trim();
            if (trimmedValue && !suggestions.some((s: ThemePromptSuggestion) => s.label === trimmedValue)) {
                // Show current input as first option for custom prompts
                const customItem: vscode.QuickPickItem = {
                    label: trimmedValue
                    // Clean custom prompt, no extra metadata
                };
                quickPick.items = [customItem, ...suggestions.map(createQuickPickItem)];
            } else if (!trimmedValue) {
                // Back to suggestions only
                quickPick.items = suggestions.map(createQuickPickItem);
            }
        });

        quickPick.show();
    });
};
