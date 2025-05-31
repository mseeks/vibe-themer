import * as vscode from 'vscode';
import { ensureOpenAIClient as ensureOpenAIClientCore, getCurrentClientState } from './openaiCore';
import { applyStreamingThemeSetting, parseStreamingThemeLine, StreamingThemeSetting } from './themeCore';
import { getSelectedOpenAIModel } from '../commands/modelSelectCommand';
import { OpenAIServiceResult, OpenAIServiceError } from '../types/theme';
import * as fs from "fs";
import * as path from "path";

/**
 * Shows a success popup after streaming theme application with recap and reset option.
 * Emphasizes the importance of using the reset command to remove the theme.
 */
async function showStreamingThemeSuccessPopup(
    themeDescription: string, 
    settingsApplied: number,
    context: vscode.ExtensionContext
): Promise<void> {
    const completenessMessage = settingsApplied < 50 
        ? "⚠️ Partial theme generated - you may want to regenerate for more comprehensive styling"
        : settingsApplied < 80
        ? "✅ Good theme coverage - most UI elements should be styled"
        : "🎨 Comprehensive theme generated - all major UI areas styled!";
        
    const message = `🎨 Theme "${themeDescription}" applied successfully!\n\nApplied ${settingsApplied} color settings in real-time\n\n${completenessMessage}\n\n⚠️ IMPORTANT: This theme overrides your VS Code settings. Use "Reset Theme Customizations" command to remove it and return to your original theme.`;
    
    const action = await vscode.window.showInformationMessage(
        message,
        {
            modal: true,
            detail: 'Your theme was applied live as AI generated each setting. To return to your original theme, you must use the Reset command - simply changing themes in VS Code settings will not remove these customizations.'
        },
        'Keep Theme',
        'Reset Theme (Remove All Customizations)'
    );

    if (action === 'Reset Theme (Remove All Customizations)') {
        // Execute the reset theme command
        await vscode.commands.executeCommand('dynamicThemeChanger.resetTheme');
    }
}

/**
 * Orchestrates the streaming theme generation workflow: prompts user, calls OpenAI with streaming, applies theme settings in real-time.
 * 
 * This function demonstrates real-time theme application as the AI generates settings.
 * Each setting is applied immediately as it's received, providing dynamic visual feedback.
 * 
 * Updates the lastGeneratedThemeRef with the accumulated theme data.
 */
export async function runThemeGenerationWorkflow(
    context: vscode.ExtensionContext,
    lastGeneratedThemeRef: { current?: any }
) {
    // Use the enhanced OpenAI client with better error handling and state management
    const openaiResult = await ensureOpenAIClientCore(context);
    if (!openaiResult.success) {
        // The ensureOpenAIClient already handled user interaction and error display
        const clientState = getCurrentClientState();
        if (clientState.status === 'error') {
            console.error('Theme generation aborted due to OpenAI client error:', clientState.error);
        }
        return;
    }

    const openai = openaiResult.data;

    const themeDescription = await vscode.window.showInputBox({
        prompt: '🎨 Describe your ideal coding atmosphere (e.g., "warm sunset over mountains", "cyberpunk neon city", "calm forest morning")',
        placeHolder: 'Be descriptive for best results: "cozy autumn evening with golden highlights"',
        value: '',
        validateInput: (value) => {
            if (!value.trim()) {
                return 'Please enter a theme description';
            }
            if (value.trim().length < 3) {
                return 'Please provide a more detailed description for better results';
            }
            return null;
        }
    });
    if (!themeDescription) {
        vscode.window.showInformationMessage('No theme description provided. Try again when you\'re ready to create your perfect coding atmosphere! 🎨', { modal: true });
        return;
    }

    const selectedModel = getSelectedOpenAIModel(context) || "gpt-4.1-mini";

    // Streaming theme data accumulation
    const accumulatedSelectors: Record<string, string> = {};
    const accumulatedTokenColors: any[] = [];
    let settingsApplied = 0;
    const hasWorkspaceFolders = (vscode.workspace.workspaceFolders?.length ?? 0) > 0;

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "🎨 Creating your perfect theme...",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "🤖 AI is analyzing your description..." });
            
            // Read streaming prompt
            const streamingPrompt = fs.readFileSync(
                path.join(context.extensionUri.fsPath, 'src', 'prompts', 'streamingThemePrompt.txt'),
                'utf8'
            );

            // Create streaming completion for comprehensive themes
            const stream = await openai.chat.completions.create({
                model: selectedModel,
                messages: [
                    { role: "system", content: streamingPrompt },
                    { role: "user", content: `Theme description: ${themeDescription}` }
                ],
                stream: true
            });

            let buffer = '';
            let errorCount = 0;
            const maxErrors = 5; // Allow some failed settings before giving up

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                buffer += content;

                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.trim()) continue;

                    const parseResult = parseStreamingThemeLine(line);
                    
                    if (parseResult.success) {
                        const setting = parseResult.setting;
                        
                        // Apply the setting immediately
                        const applyResult = await applyStreamingThemeSetting(setting, hasWorkspaceFolders);
                        
                        if (applyResult.success) {
                            settingsApplied++;
                            
                            // Accumulate for theme data structure
                            if (setting.type === 'selector') {
                                accumulatedSelectors[setting.name] = setting.color;
                            } else if (setting.type === 'token') {
                                accumulatedTokenColors.push({
                                    scope: setting.scope,
                                    settings: {
                                        foreground: setting.color,
                                        ...(setting.fontStyle && { fontStyle: setting.fontStyle })
                                    }
                                });
                            }
                            
                            // Update progress with completion tracking
                            const settingName = setting.type === 'selector' ? setting.name : setting.scope;
                            const progressMessage = settingsApplied < 50 
                                ? `🎨 Applying ${settingName} (${settingsApplied}/100+ settings)`
                                : settingsApplied < 100
                                ? `✨ Great progress! Applied ${settingName} (${settingsApplied}/100+ settings)`
                                : `🌟 Comprehensive theme! Applied ${settingName} (${settingsApplied} settings)`;
                                
                            progress.report({ 
                                message: progressMessage
                            });
                        } else {
                            errorCount++;
                            console.warn(`Failed to apply setting: ${line}`, applyResult.error);
                            
                            if (errorCount >= maxErrors) {
                                throw new Error(`Too many failed settings (${errorCount}). Last error: ${applyResult.error.message}`);
                            }
                        }
                    } else {
                        errorCount++;
                        console.warn(`Failed to parse line: ${line}`, parseResult.error);
                        
                        if (errorCount >= maxErrors) {
                            throw new Error(`Too many parsing errors (${errorCount}). Last error: ${parseResult.error}`);
                        }
                    }
                }
            }

            // Process any remaining content in buffer
            if (buffer.trim()) {
                const parseResult = parseStreamingThemeLine(buffer.trim());
                if (parseResult.success) {
                    const applyResult = await applyStreamingThemeSetting(parseResult.setting, hasWorkspaceFolders);
                    if (applyResult.success) {
                        settingsApplied++;
                        const setting = parseResult.setting;
                        if (setting.type === 'selector') {
                            accumulatedSelectors[setting.name] = setting.color;
                        } else if (setting.type === 'token') {
                            accumulatedTokenColors.push({
                                scope: setting.scope,
                                settings: {
                                    foreground: setting.color,
                                    ...(setting.fontStyle && { fontStyle: setting.fontStyle })
                                }
                            });
                        }
                    }
                }
            }

            progress.report({ message: `🎉 Theme complete! Applied ${settingsApplied} color settings to transform your VS Code` });
        });

        // Build theme data structure for reference
        const coreColors = {
            primary: accumulatedSelectors["activityBar.background"] || "#007acc",
            secondary: accumulatedSelectors["statusBar.background"] || "#444444", 
            accent: accumulatedSelectors["activityBarBadge.background"] || "#ff8c00",
            background: accumulatedSelectors["editor.background"] || "#1e1e1e",
            foreground: accumulatedSelectors["editor.foreground"] || "#d4d4d4"
        };

        lastGeneratedThemeRef.current = {
            name: `Custom Theme - ${themeDescription}`,
            description: `Theme generated from: "${themeDescription}"`,
            colors: coreColors,
            tokenColors: accumulatedTokenColors
        };

        // Show success popup with streaming results
        await showStreamingThemeSuccessPopup(themeDescription, settingsApplied, context);
        
    } catch (error: any) {
        // Enhanced error handling for streaming
        const isNetworkError = error.message.includes('fetch') || 
                               error.message.includes('network') || 
                               error.message.includes('connection');
        
        const isAPIError = error.message.includes('API') || 
                          error.message.includes('429') || 
                          error.message.includes('quota');
        
        const isStreamingError = error.message.includes('stream') || 
                                error.message.includes('parsing') ||
                                error.message.includes('settings');

        // Provide contextual error messages based on error type
        let errorPrefix: string;
        let suggestedAction: string | undefined;

        if (isNetworkError) {
            errorPrefix = '🌐 Connection issue during theme generation';
            suggestedAction = 'Please check your internet connection and try again';
        } else if (isAPIError) {
            errorPrefix = '🔑 OpenAI API issue during theme creation';
            suggestedAction = 'Please check your API key validity and quota limits in your OpenAI dashboard';
        } else if (isStreamingError) {
            errorPrefix = '⚠️ Theme generation was interrupted';
            suggestedAction = `${settingsApplied} settings were successfully applied before the interruption. You can try generating again to continue, or use "Reset Theme Customizations" to start fresh.`;
        } else {
            errorPrefix = '❌ Theme generation encountered an error';
            suggestedAction = 'Please try again with a different description, or contact support if the issue persists';
        }

        const fullMessage = suggestedAction 
            ? `${errorPrefix}: ${error.message}. ${suggestedAction}`
            : `${errorPrefix}: ${error.message}`;

        vscode.window.showErrorMessage(fullMessage, { modal: true });
        
        // Log detailed error information for debugging
        console.error('Streaming theme generation error:', {
            originalError: error,
            errorType: isNetworkError ? 'network' : isAPIError ? 'api' : isStreamingError ? 'streaming' : 'unknown',
            clientState: getCurrentClientState(),
            themeDescription,
            selectedModel,
            settingsApplied,
            accumulatedSelectors: Object.keys(accumulatedSelectors).length,
            accumulatedTokenColors: accumulatedTokenColors.length
        });
    }
}