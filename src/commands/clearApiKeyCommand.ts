import * as vscode from 'vscode';
import OpenAI from 'openai';

/**
 * Registers the command to clear the OpenAI API key and reset the OpenAI client instance.
 * @param context The extension context
 * @param openaiRef Reference to the OpenAI client variable (if you want to clear it)
 */
export function registerClearApiKeyCommand(context: vscode.ExtensionContext, openaiRef?: { current?: OpenAI }) {
    const clearApiKeyCommand = vscode.commands.registerCommand('dynamicThemeChanger.clearApiKey', async () => {
        await context.secrets.delete('openaiApiKey');
        if (openaiRef) {
            openaiRef.current = undefined;
        }
        vscode.window.showInformationMessage('OpenAI API Key cleared. You will be prompted for it again on next use.');
    });
    context.subscriptions.push(clearApiKeyCommand);
}
