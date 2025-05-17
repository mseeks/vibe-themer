// OpenAI service for Dynamic Theme Changer
import * as vscode from 'vscode';
import OpenAI from 'openai';

// Store OpenAI client instance
let openai: OpenAI | undefined;

/**
 * Initializes the OpenAI client with the API key
 * @param context The extension context used to access secrets storage
 * @returns A boolean indicating whether initialization was successful
 */
export async function initializeOpenAIClient(context: vscode.ExtensionContext): Promise<boolean> {
    // Get OpenAI API key
    let apiKey = await context.secrets.get('openaiApiKey');
    
    if (!apiKey) {
        apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your OpenAI API Key',
            ignoreFocusOut: true, // Keep input box open even if focus moves
            password: true, // Mask the input
        });
        
        if (apiKey) {
            await context.secrets.store('openaiApiKey', apiKey);
            vscode.window.showInformationMessage('OpenAI API Key stored successfully!');
            openai = new OpenAI({ apiKey });
            return true;
        } else {
            vscode.window.showErrorMessage('OpenAI API Key is required for this extension to work.');
            return false; // No key provided
        }
    } else {
        openai = new OpenAI({ apiKey });
        return true;
    }
}

/**
 * Get the current OpenAI client instance
 * @returns The current OpenAI client or undefined if not initialized
 */
export function getOpenAIClient(): OpenAI | undefined {
    return openai;
}
