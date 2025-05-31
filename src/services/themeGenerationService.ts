import * as vscode from 'vscode';
import { ensureOpenAIClient, getOpenAIClientState } from './openaiService';
import { applyThemeCustomizations } from './themeCore';
import { getSelectedOpenAIModel } from '../commands/modelSelectCommand';
import { OpenAIServiceResult, OpenAIServiceError } from '../types/theme';
import * as fs from "fs";
import * as path from "path";

/**
 * Shows a success popup after theme application with user recap and reset option.
 * Provides clear feedback about what was generated and an obvious way to delete the theme.
 */
async function showThemeSuccessPopup(
    themeDescription: string, 
    context: vscode.ExtensionContext
): Promise<void> {
    const message = `✅ Theme successfully generated and applied!\n\nYour theme: "${themeDescription}"`;
    
    const action = await vscode.window.showInformationMessage(
        message,
        {
            modal: false,
            detail: 'Your VS Code theme has been updated with AI-generated colors based on your description.'
        },
        'Delete Theme (Resets to Default)'
    );

    if (action === 'Delete Theme (Resets to Default)') {
        // Execute the reset theme command
        await vscode.commands.executeCommand('dynamicThemeChanger.resetTheme');
    }
}

/**
 * Orchestrates the theme generation workflow: prompts user, calls OpenAI, parses response, applies theme.
 * 
 * This function demonstrates how to integrate with our new OpenAI service architecture.
 * It handles all progress, error, and user messaging using the enhanced patterns from
 * our functional refactoring while maintaining the same external interface.
 * 
 * Updates the lastGeneratedThemeRef with the new theme.
 */
export async function runThemeGenerationWorkflow(
    context: vscode.ExtensionContext,
    lastGeneratedThemeRef: { current?: any }
) {
    // Use the enhanced OpenAI client with better error handling and state management
    const openai = await ensureOpenAIClient(context);
    if (!openai) {
        // The ensureOpenAIClient already handled user interaction and error display
        // We can optionally provide additional context based on the client state
        const clientState = getOpenAIClientState();
        if (clientState.status === 'error') {
            console.error('Theme generation aborted due to OpenAI client error:', clientState.error);
        }
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
            const result = await applyThemeCustomizations(
                selectors,
                tokenColors,
                themeDescription,
                true // suppressNotifications = true
            );
            
            // If theme application failed, throw an error to be caught by outer try-catch
            if (!result.success) {
                throw new Error(result.error.message);
            }
        });

        // Show success popup with theme recap and reset option
        await showThemeSuccessPopup(themeDescription, context);
        
    } catch (error: any) {
        // Enhanced error handling using our functional architecture patterns
        // We categorize errors and provide more specific user feedback
        const isNetworkError = error.message.includes('fetch') || 
                               error.message.includes('network') || 
                               error.message.includes('connection');
        
        const isAPIError = error.message.includes('API') || 
                          error.message.includes('429') || 
                          error.message.includes('quota');
        
        const isParsingError = error.message.includes('parse') || 
                              error.message.includes('JSON') || 
                              error.message.includes('Invalid');

        // Provide contextual error messages based on error type
        let errorPrefix: string;
        let suggestedAction: string | undefined;

        if (isNetworkError) {
            errorPrefix = 'Network error while communicating with OpenAI';
            suggestedAction = 'Check your internet connection and try again';
        } else if (isAPIError) {
            errorPrefix = 'OpenAI API error';
            suggestedAction = 'Check your API key validity and quota limits';
        } else if (isParsingError) {
            errorPrefix = 'Could not generate a valid color theme';
            suggestedAction = 'Try rephrasing your theme description or try again';
        } else {
            errorPrefix = 'Theme generation failed';
            suggestedAction = 'Please try again or contact support if the issue persists';
        }

        const fullMessage = suggestedAction 
            ? `${errorPrefix}: ${error.message}. ${suggestedAction}.`
            : `${errorPrefix}: ${error.message}`;

        vscode.window.showErrorMessage(fullMessage);
        
        // Log detailed error information for debugging
        console.error('Theme generation workflow error:', {
            originalError: error,
            errorType: isNetworkError ? 'network' : isAPIError ? 'api' : isParsingError ? 'parsing' : 'unknown',
            clientState: getOpenAIClientState(),
            themeDescription,
            selectedModel
        });
    }
}