import * as vscode from 'vscode';

/**
 * Registers the command to reset theme customizations.
 * @param context The extension context
 * @param lastGeneratedThemeRef Reference to the lastGeneratedTheme variable (optional, for clearing)
 */
export function registerResetThemeCommand(context: vscode.ExtensionContext, lastGeneratedThemeRef?: { current?: any }) {
    const resetThemeCommand = vscode.commands.registerCommand('dynamicThemeChanger.resetTheme', async () => {
        try {
            const config = vscode.workspace.getConfiguration();
            const configTarget = vscode.workspace.workspaceFolders 
                ? vscode.ConfigurationTarget.Workspace 
                : vscode.ConfigurationTarget.Global;

            try {
                // Reset both workbench and token color customizations
                await Promise.all([
                    config.update('workbench.colorCustomizations', undefined, configTarget),
                    config.update('editor.tokenColorCustomizations', undefined, configTarget)
                ]);

                // Try both ways - with empty object and with undefined
                if (Object.keys(config.get('workbench.colorCustomizations') || {}).length > 0) {
                    await config.update('workbench.colorCustomizations', {}, configTarget);
                }
                if (Object.keys(config.get('editor.tokenColorCustomizations') || {}).length > 0) {
                    await config.update('editor.tokenColorCustomizations', {}, configTarget);
                }

                // Clear the last generated theme
                if (lastGeneratedThemeRef) {
                    lastGeneratedThemeRef.current = undefined;
                }

                // Also try to reset at the other level just to be sure
                const otherTarget = configTarget === vscode.ConfigurationTarget.Workspace 
                    ? vscode.ConfigurationTarget.Global 
                    : vscode.ConfigurationTarget.Workspace;
                try {
                    await Promise.all([
                        config.update('workbench.colorCustomizations', undefined, otherTarget),
                        config.update('editor.tokenColorCustomizations', undefined, otherTarget)
                    ]);
                } catch {
                    // Ignore errors when trying to reset the other target
                }

                // Force a theme reload by temporarily changing the theme and changing back
                const currentTheme = config.get('workbench.colorTheme');
                const tempTheme = currentTheme === 'Default Dark+' ? 'Default Light+' : 'Default Dark+';
                try {
                    await config.update('workbench.colorTheme', tempTheme, vscode.ConfigurationTarget.Global);
                    setTimeout(async () => {
                        await config.update('workbench.colorTheme', currentTheme, vscode.ConfigurationTarget.Global);
                    }, 300);
                } catch {}

                vscode.window.showInformationMessage('All theme customizations cleared. Your selected theme should now display correctly.');
            } catch (error) {
                // If updating workspace settings fails, try user settings
                if (configTarget === vscode.ConfigurationTarget.Workspace) {
                    try {
                        await config.update('workbench.colorCustomizations', undefined, vscode.ConfigurationTarget.Global);
                        await config.update('editor.tokenColorCustomizations', undefined, vscode.ConfigurationTarget.Global);
                        await config.update('workbench.colorCustomizations', {}, vscode.ConfigurationTarget.Global);
                        await config.update('editor.tokenColorCustomizations', {}, vscode.ConfigurationTarget.Global);
                        if (lastGeneratedThemeRef) {
                            lastGeneratedThemeRef.current = undefined;
                        }
                        vscode.window.showInformationMessage('Global theme customizations cleared.');
                    } catch (globalError: any) {
                        throw new Error(`Failed to reset theme: ${globalError.message}`);
                    }
                } else {
                    throw error;
                }
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to reset theme customizations: ${error.message}`);
        }
    });
    context.subscriptions.push(resetThemeCommand);
}
