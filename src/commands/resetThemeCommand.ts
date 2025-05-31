import * as vscode from 'vscode';

/**
 * Registers the command to reset theme customizations.
 */
export function registerResetThemeCommand(context: vscode.ExtensionContext, lastGeneratedThemeRef?: { current?: any }) {
    const resetThemeCommand = vscode.commands.registerCommand('dynamicThemeChanger.resetTheme', async () => {
        try {
            const config = vscode.workspace.getConfiguration();
            
            // Clear both workspace and global settings
            const resetPromises = [
                config.update('workbench.colorCustomizations', undefined, vscode.ConfigurationTarget.Workspace),
                config.update('editor.tokenColorCustomizations', undefined, vscode.ConfigurationTarget.Workspace),
                config.update('workbench.colorCustomizations', undefined, vscode.ConfigurationTarget.Global),
                config.update('editor.tokenColorCustomizations', undefined, vscode.ConfigurationTarget.Global)
            ];
            
            await Promise.allSettled(resetPromises);
            
            // Clear the last generated theme
            if (lastGeneratedThemeRef) {
                lastGeneratedThemeRef.current = undefined;
            }
            
            vscode.window.showInformationMessage('Theme customizations cleared successfully.');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to reset theme: ${error.message}`);
        }
    });
    
    context.subscriptions.push(resetThemeCommand);
}
