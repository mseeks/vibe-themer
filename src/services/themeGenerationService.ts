import * as vscode from 'vscode';
import { ensureOpenAIClient, generateTokenColors } from './openaiService';
import { loadPromptTemplates } from './promptService';
import { parseAndNormalizeColorPalette, NormalizedColorPalette } from '../utils/colorPaletteParser';
import { applyThemeCustomizations } from './themeService';
import { getSelectedOpenAIModel } from '../commands/modelSelectCommand';

/**
 * Orchestrates the theme generation workflow: prompts user, calls OpenAI, parses palette, applies theme.
 * Handles all progress, error, and user messaging.
 * Updates the lastGeneratedThemeRef with the new theme.
 */
export async function runThemeGenerationWorkflow(
    context: vscode.ExtensionContext,
    lastGeneratedThemeRef: { current?: any }
) {
    const openai = await ensureOpenAIClient(context);
    if (!openai) return;

    let promptTemplates;
    try {
        promptTemplates = loadPromptTemplates(context);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Error loading prompt templates: ${error.message}`);
        return;
    }

    const themeDescription = await vscode.window.showInputBox({
        prompt: 'Describe the theme you want (e.g., "warm and cozy", "futuristic dark blue")',
        placeHolder: 'e.g., "ocean vibes"'
    });
    if (!themeDescription) {
        vscode.window.showInformationMessage('No theme description provided.');
        return;
    }

    const selectedModel = getSelectedOpenAIModel(context) || "gpt-4.1-mini";

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating theme colors...",
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ message: "Generating base colors..." });
                const completion = await openai.chat.completions.create({
                    model: selectedModel,
                    messages: [
                        { role: "system", content: promptTemplates.baseColorsPrompt },
                        { role: "user", content: themeDescription }
                    ],
                    max_completion_tokens: 2000
                });
                const colorResponse = completion.choices[0]?.message?.content?.trim();
                const defaultColors: NormalizedColorPalette = {
                    primary: '#007acc',
                    secondary: '#444444',
                    accent: '#ff8c00',
                    background: '#1e1e1e',
                    foreground: '#d4d4d4'
                };
                const { palette, replaced } = parseAndNormalizeColorPalette(colorResponse || '{}', defaultColors);
                const { primary, secondary, accent, background, foreground } = palette;
                if (replaced.length > 0) {
                    vscode.window.showWarningMessage('Some colors were invalid and have been replaced with fallbacks.');
                }
                lastGeneratedThemeRef.current = {
                    name: `Custom Theme - ${themeDescription}`,
                    description: `Theme generated from: "${themeDescription}"`,
                    colors: { primary, secondary, accent, background, foreground }
                };
                progress.report({ message: "Generating syntax highlighting colors..." });
                const tokenColors = await generateTokenColors(
                    openai,
                    promptTemplates,
                    { primary, secondary, accent, background, foreground },
                    themeDescription,
                    selectedModel
                );
                lastGeneratedThemeRef.current.tokenColors = tokenColors;
                await applyThemeCustomizations(
                    { primary, secondary, accent, background, foreground },
                    tokenColors,
                    themeDescription
                );
            } catch (error: any) {
                vscode.window.showErrorMessage(`Could not generate a valid color theme. Error: ${error.message}`);
            }
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Error communicating with OpenAI: ${error.message}`);
    }
}