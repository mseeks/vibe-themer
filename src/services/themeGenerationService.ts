import * as vscode from 'vscode';
import { ensureOpenAIClient } from './openaiService';
import { applyThemeCustomizations } from './themeService';
import { applyThemeCustomizations as applyThemeCustomizationsCore } from './themeApplication';
import { SilentNotificationStrategy, createVSCodeDependencies } from './themeAdapters';
import { getSelectedOpenAIModel } from '../commands/modelSelectCommand';
import * as fs from "fs";
import * as path from "path";

/**
 * Orchestrates the theme generation workflow: prompts user, calls OpenAI, parses response, applies theme.
 * Handles all progress, error, and user messaging.
 * Updates the lastGeneratedThemeRef with the new theme.
 */
export async function runThemeGenerationWorkflow(
    context: vscode.ExtensionContext,
    lastGeneratedThemeRef: { current?: any }
) {
    const openai = await ensureOpenAIClient(context);
    if (!openai) return;

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
            progress.report({ message: "Generating selectors and token colors..." });
            
            // Generate theme with OpenAI
            const combinedPrompt = fs.readFileSync(
                path.join(context.extensionUri.fsPath, 'src', 'prompts', 'combinedThemePrompt.txt'),
                'utf8'
            );
            const completion = await openai.chat.completions.create({
                model: selectedModel,
                messages: [
                    { role: "system", content: combinedPrompt },
                    { role: "user", content: `Theme description: ${themeDescription}` }
                ]
            });
            
            const responseText = completion.choices[0]?.message?.content?.trim();
            if (!responseText) throw new Error('No response from LLM.');
            
            let parsed;
            try {
                parsed = JSON.parse(responseText);
            } catch (e) {
                throw new Error('Failed to parse LLM response as JSON.');
            }
            
            // Validate selectors
            const selectors = parsed.selectors;
            if (!selectors || typeof selectors !== 'object') {
                throw new Error('Selector color mapping missing or invalid in LLM response.');
            }
            
            // Validate tokenColors
            const tokenColors = Array.isArray(parsed.tokenColors) ? parsed.tokenColors : [];
            
            progress.report({ message: "Applying theme..." });
            
            // Extract core colors from selectors for theme data structure
            const coreColors = {
                primary: selectors["activityBar.background"] || "#007acc",
                secondary: selectors["statusBar.background"] || "#444444",
                accent: selectors["activityBarBadge.background"] || "#ff8c00",
                background: selectors["editor.background"] || "#1e1e1e",
                foreground: selectors["editor.foreground"] || "#d4d4d4"
            };
            
            lastGeneratedThemeRef.current = {
                name: `Custom Theme - ${themeDescription}`,
                description: `Theme generated from: "${themeDescription}"`,
                colors: coreColors,
                tokenColors
            };
            
            // Apply theme with silent notifications to avoid double error dialogs
            // We'll handle success/error notifications in the outer try-catch
            const silentDeps = {
                ...createVSCodeDependencies(),
                notification: new SilentNotificationStrategy()
            };
            
            const result = await applyThemeCustomizationsCore(
                selectors,
                tokenColors,
                themeDescription,
                silentDeps
            );
            
            // If theme application failed, throw an error to be caught by outer try-catch
            if (!result.success) {
                throw new Error(result.error.message);
            }
        });
        
        // Show success notification outside of withProgress to ensure proper dismissal
        vscode.window.showInformationMessage(`Theme "${themeDescription}" applied successfully!`);
        
    } catch (error: any) {
        // Handle both communication errors and theme generation/application errors
        const isNetworkError = error.message.includes('fetch') || error.message.includes('network') || error.message.includes('connection');
        const errorPrefix = isNetworkError ? 'Error communicating with OpenAI' : 'Could not generate a valid color theme';
        vscode.window.showErrorMessage(`${errorPrefix}: ${error.message}`);
    }
}