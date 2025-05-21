import { getContrastColor, adjustColor, isDarkTheme } from '../utils/colorUtils';
import * as vscode from 'vscode';
import { forceNotificationStyleRefresh } from './notificationService';

/**
 * Applies the given theme color customizations and token colors to VS Code settings.
 * @param colorCustomizations The full color customizations object (from LLM/json_schema)
 * @param tokenColors The token color rules (optional)
 * @param themeDescription The theme description (for notifications)
 */
export async function applyThemeCustomizations(
    colorCustomizations: Record<string, string>,
    tokenColors: any[] | undefined,
    themeDescription: string
) {
    const config = vscode.workspace.getConfiguration();

    // Optionally, you can still set notification overrides if needed
    // (or remove this block if all notification colors are in colorCustomizations)
    // const allThemesNotificationOverride = {
    //     "[*]": {
    //         "notification.background": colorCustomizations["notification.background"],
    //         "notification.foreground": colorCustomizations["notification.foreground"],
    //         "notification.buttonBackground": colorCustomizations["button.background"],
    //         "notification.buttonForeground": colorCustomizations["button.foreground"],
    //         // ...add more if needed
    //     }
    // };
    // await config.update('workbench.colorCustomizations', allThemesNotificationOverride, vscode.ConfigurationTarget.Global);

    const configTarget = vscode.workspace.workspaceFolders 
        ? vscode.ConfigurationTarget.Workspace 
        : vscode.ConfigurationTarget.Global;
    try {
        // Apply color customizations globally
        await config.update('workbench.colorCustomizations', colorCustomizations, vscode.ConfigurationTarget.Global);

        // Also apply to workspace if it exists
        if (vscode.workspace.workspaceFolders) {
            await config.update('workbench.colorCustomizations', colorCustomizations, vscode.ConfigurationTarget.Workspace);
        }

        if (tokenColors && tokenColors.length > 0) {
            const currentTokenColorCustomizations = config.get('editor.tokenColorCustomizations') || {};
            const newTokenColorCustomizations = {
                ...currentTokenColorCustomizations,
                "textMateRules": tokenColors
            };
            await config.update('editor.tokenColorCustomizations', newTokenColorCustomizations, vscode.ConfigurationTarget.Global);
            if (vscode.workspace.workspaceFolders) {
                await config.update('editor.tokenColorCustomizations', newTokenColorCustomizations, vscode.ConfigurationTarget.Workspace);
            }
        }

        // Force refresh the notification styles
        forceNotificationStyleRefresh();

        // Show a test notification with the new colors
        setTimeout(() => {
            const testNotification = vscode.window.showInformationMessage(
                tokenColors && tokenColors.length > 0
                    ? `Theme updated with syntax highlighting based on: "${themeDescription}"`
                    : `Theme updated based on: "${themeDescription}"`,
                { modal: false },
                'Reload Window',
                'Test Notification'
            ).then(selection => {
                if (selection === 'Reload Window') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                } else if (selection === 'Test Notification') {
                    vscode.window.showWarningMessage(`This is a test warning notification using theme colors`);
                    vscode.window.showErrorMessage(`This is a test error notification using theme colors`);
                }
            });
        }, 1000);
    } catch (updateError) {
        // If updating workspace settings fails, try user settings
        if (configTarget === vscode.ConfigurationTarget.Workspace) {
            try {
                await config.update('workbench.colorCustomizations', colorCustomizations, vscode.ConfigurationTarget.Global);
                if (tokenColors && tokenColors.length > 0) {
                    const currentTokenColorCustomizations = config.get('editor.tokenColorCustomizations') || {};
                    const newTokenColorCustomizations = {
                        ...currentTokenColorCustomizations,
                        "textMateRules": tokenColors
                    };
                    await config.update('editor.tokenColorCustomizations', newTokenColorCustomizations, vscode.ConfigurationTarget.Global);
                }
                vscode.window.showInformationMessage(`Theme updated in user settings based on: "${themeDescription}"`);
            } catch (globalError: any) {
                throw new Error(`Failed to update settings: ${globalError.message}`);
            }
        } else {
            throw updateError;
        }
    }
}