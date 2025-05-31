/**
 * Clear API Key Command - Elegant credential management.
 * 
 * This module provides a clean interface for clearing stored OpenAI credentials.
 * It leverages our refactored architecture to provide proper error handling,
 * state management, and user feedback.
 */

import * as vscode from 'vscode';
import OpenAI from 'openai';
import { resetOpenAIClient } from '../services/openaiService';

/**
 * Registers the command to clear the OpenAI API key and reset the OpenAI client.
 * 
 * Now uses our improved architecture for robust credential management with
 * comprehensive error handling and proper state cleanup.
 * 
 * @param context - The extension context for command registration and credential access
 * @param openaiRef - Legacy reference maintained for backward compatibility
 */
export function registerClearApiKeyCommand(
    context: vscode.ExtensionContext, 
    openaiRef?: { current?: OpenAI }
) {
    const clearApiKeyCommand = vscode.commands.registerCommand(
        'dynamicThemeChanger.clearApiKey', 
        async () => {
            try {
                // Use our new architecture for robust credential clearing
                await resetOpenAIClient(context);
                
                // Clear legacy reference for backward compatibility
                if (openaiRef) {
                    openaiRef.current = undefined;
                }
                
                // Success feedback is handled by the service layer
                // No need for duplicate messaging here
                
            } catch (error) {
                // Fallback error handling in case the service layer fails
                console.error('Failed to clear API key:', error);
                vscode.window.showErrorMessage(
                    'Failed to clear API key. Please try again or restart VS Code.',
                    { modal: true }
                );
            }
        }
    );
    
    context.subscriptions.push(clearApiKeyCommand);
}
