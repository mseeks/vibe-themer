import * as vscode from 'vscode';
import { ensureOpenAIClient as ensureOpenAIClientCore, getCurrentClientState } from './openaiCore';
import { applyStreamingThemeSetting, parseStreamingThemeLine, StreamingThemeSetting } from './themeCore';
import { getSelectedOpenAIModel } from '../commands/modelSelectCommand';
import { OpenAIServiceResult, OpenAIServiceError } from '../types/theme';
import * as fs from "fs";
import * as path from "path";

/**
 * Handles user choice when theme generation is cancelled with partial results.
 * Offers to keep the partial theme or reset to the previous state.
 */
async function handleCancellationChoice(
    settingsApplied: number,
    themeDescription: string
): Promise<'keep' | 'reset'> {
    if (settingsApplied === 0) {
        // No settings applied, just acknowledge cancellation
        await vscode.window.showInformationMessage(
            '🚫 Theme generation cancelled. No changes were made.',
            { modal: true }
        );
        return 'keep'; // Nothing to reset
    }

    const message = `🛑 Theme generation was cancelled after applying ${settingsApplied} settings.

Would you like to keep the partial theme or reset to your previous state?

Keep: Maintain the ${settingsApplied} color settings that were already applied
Reset: Remove all applied settings and return to your original theme`;

    const choice = await vscode.window.showWarningMessage(
        message,
        {
            modal: true,
            detail: 'The partial theme may look incomplete since not all UI elements were styled.'
        },
        'Keep Partial Theme',
        'Reset to Original'
    );

    return choice === 'Reset to Original' ? 'reset' : 'keep';
}

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
        await vscode.commands.executeCommand('vibeThemer.resetTheme');
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

    const selectedModel = getSelectedOpenAIModel(context) || "gpt-4.1";

    // Streaming theme data accumulation
    const accumulatedSelectors: Record<string, string> = {};
    const accumulatedTokenColors: any[] = [];
    let settingsApplied = 0;
    let expectedSettingsCount = 120; // Default fallback value
    let wasCancelled = false;
    const hasWorkspaceFolders = (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
    let currentMessage = "🤖 AI analyzing your vibe...";
    let lastMessageTime = Date.now(); // Initialize with current time
    const MIN_MESSAGE_DURATION = 800; // Show messages for at least 0.8 seconds - quick but readable

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "",
            cancellable: true
        }, async (progress, cancellationToken) => {
            // Initialize progress tracking
            (progress as any)._lastPercent = 0;
            progress.report({ message: currentMessage, increment: 0 });
            
            // Read streaming prompt using proper extension resource path
            const promptPath = context.asAbsolutePath(path.join('prompts', 'streamingThemePrompt.txt'));
            let streamingPrompt: string;
            
            try {
                streamingPrompt = fs.readFileSync(promptPath, 'utf8');
            } catch (error) {
                throw new Error(`Failed to load theme generation prompt from ${promptPath}. Please reinstall the extension. Error: ${error}`);
            }

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
                // Check for cancellation at the start of each chunk
                if (cancellationToken.isCancellationRequested) {
                    break;
                }

                const content = chunk.choices[0]?.delta?.content || '';
                buffer += content;

                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (!line.trim()) {continue;}
                    
                    // Check for cancellation before processing each line
                    if (cancellationToken.isCancellationRequested) {
                        break;
                    }

                    const parseResult = parseStreamingThemeLine(line);
                    
                    if (parseResult.success) {
                        const setting = parseResult.setting;
                        
                        // Apply the setting immediately
                        const applyResult = await applyStreamingThemeSetting(setting, hasWorkspaceFolders);
                        
                        if (applyResult.success) {
                            // Handle different setting types
                            if (setting.type === 'count') {
                                expectedSettingsCount = setting.total;
                                currentMessage = `🎯 Planning ${setting.total} theme settings...`;
                                progress.report({ message: currentMessage });
                                
                            } else if (setting.type === 'selector') {
                                settingsApplied++;
                                accumulatedSelectors[setting.name] = setting.color;
                                
                                // Update progress percentage using actual expected count
                                const progressPercent = Math.min(Math.floor((settingsApplied / expectedSettingsCount) * 100), 99);
                                progress.report({ 
                                    message: currentMessage, 
                                    increment: progressPercent - (progress as any)._lastPercent || 0
                                });
                                (progress as any)._lastPercent = progressPercent;
                                
                            } else if (setting.type === 'token') {
                                settingsApplied++;
                                accumulatedTokenColors.push({
                                    scope: setting.scope,
                                    settings: {
                                        foreground: setting.color,
                                        ...(setting.fontStyle && { fontStyle: setting.fontStyle })
                                    }
                                });
                                
                                // Update progress percentage using actual expected count
                                const progressPercent = Math.min(Math.floor((settingsApplied / expectedSettingsCount) * 100), 99);
                                progress.report({ 
                                    message: currentMessage, 
                                    increment: progressPercent - (progress as any)._lastPercent || 0
                                });
                                (progress as any)._lastPercent = progressPercent;
                                
                            } else if (setting.type === 'message') {
                                // Only update message if enough time has passed or it's the first message
                                const now = Date.now();
                                if (now - lastMessageTime >= MIN_MESSAGE_DURATION || lastMessageTime === 0) {
                                    currentMessage = `✨ ${setting.content}`;
                                    lastMessageTime = now;
                                    progress.report({ message: currentMessage });
                                }
                            }
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
                
                // Break out of chunk loop if cancelled
                if (cancellationToken.isCancellationRequested) {
                    break;
                }
            }

            // Handle cancellation if requested
            if (cancellationToken.isCancellationRequested) {
                wasCancelled = true;
                const choice = await handleCancellationChoice(settingsApplied, themeDescription);
                
                if (choice === 'reset') {
                    // Execute the reset theme command to remove all applied settings
                    await vscode.commands.executeCommand('vibeThemer.resetTheme');
                    return; // Exit early, no success popup needed
                }
                // If 'keep', continue with normal completion flow
            }

            // Process any remaining content in buffer (only if not cancelled)
            if (buffer.trim() && !cancellationToken.isCancellationRequested) {
                const parseResult = parseStreamingThemeLine(buffer.trim());
                if (parseResult.success) {
                    const applyResult = await applyStreamingThemeSetting(parseResult.setting, hasWorkspaceFolders);
                    if (applyResult.success) {
                        const setting = parseResult.setting;
                        if (setting.type === 'count') {
                            expectedSettingsCount = setting.total;
                        } else if (setting.type === 'selector') {
                            settingsApplied++;
                            accumulatedSelectors[setting.name] = setting.color;
                        } else if (setting.type === 'token') {
                            settingsApplied++;
                            accumulatedTokenColors.push({
                                scope: setting.scope,
                                settings: {
                                    foreground: setting.color,
                                    ...(setting.fontStyle && { fontStyle: setting.fontStyle })
                                }
                            });
                        }
                        // MESSAGE types don't need accumulation, they're just progress updates
                    }
                }
            }

            // Update final progress message based on whether it was cancelled
            const finalMessage = wasCancelled
                ? `🛑 Theme cancelled. Kept ${settingsApplied} settings.`
                : `🎉 Theme complete! ${settingsApplied} colors applied`;
            
            progress.report({ message: finalMessage, increment: 100 });
        });

        // Build theme data structure for reference (always build it, even if cancelled)
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

        // Show success popup only if generation completed normally (not cancelled)
        if (!wasCancelled) {
            await showStreamingThemeSuccessPopup(themeDescription, settingsApplied, context);
        }
        
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