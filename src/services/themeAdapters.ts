/**
 * VS Code adapter layer for theme application.
 * Handles the imperative VS Code APIs and translates them to our functional domain.
 */

import * as vscode from 'vscode';
import { 
    ConfigurationProvider, 
    NotificationStrategy, 
    ThemeApplicationDependencies,
    ThemeApplicationResult,
    ThemeApplicationError
} from '../types/theme';
import { forceNotificationStyleRefresh } from './notificationService';

/**
 * VS Code configuration provider implementation.
 * Wraps the VS Code configuration API with error handling.
 */
export class VSCodeConfigurationProvider implements ConfigurationProvider {
    constructor(private readonly config: vscode.WorkspaceConfiguration) {}

    async update(section: string, value: unknown, target: vscode.ConfigurationTarget): Promise<void> {
        await this.config.update(section, value, target);
    }

    get<T>(section: string): T | undefined {
        return this.config.get<T>(section);
    }
}

/**
 * Default notification strategy using VS Code's notification system.
 * Provides rich user feedback with actionable options.
 */
export class DefaultNotificationStrategy implements NotificationStrategy {
    readonly enableTestNotifications = true;

    async showSuccessNotification(
        result: ThemeApplicationResult, 
        description: string
    ): Promise<void> {
        if (!result.success) return;

        const scopeDescription = this.describeScopeApplication(result.appliedScope);
        const message = `Theme "${description}" applied ${scopeDescription}`;
        
        const selection = await vscode.window.showInformationMessage(
            message,
            { modal: false },
            'Reload Window',
            ...(this.enableTestNotifications ? ['Test Notifications'] : [])
        );

        await this.handleNotificationSelection(selection, description);
    }

    async showErrorNotification(error: ThemeApplicationError): Promise<void> {
        const actions = error.recoverable ? ['Retry', 'Help'] : ['Help'];
        
        const selection = await vscode.window.showErrorMessage(
            `Theme application failed: ${error.message}`,
            ...actions
        );

        if (selection === 'Help' && error.suggestedAction) {
            await vscode.window.showInformationMessage(error.suggestedAction);
        }
    }

    private describeScopeApplication(scope: any): string {
        switch (scope.type) {
            case 'workspace': return 'to workspace settings';
            case 'global': return 'to user settings';
            case 'both': return 'to both workspace and user settings';
            default: return 'successfully';
        }
    }

    private async handleNotificationSelection(
        selection: string | undefined, 
        description: string
    ): Promise<void> {
        switch (selection) {
            case 'Reload Window':
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
                break;
            case 'Test Notifications':
                await this.showTestNotifications(description);
                break;
        }
    }

    private async showTestNotifications(description: string): Promise<void> {
        // Delayed to allow theme to fully apply
        setTimeout(async () => {
            await vscode.window.showWarningMessage(
                `Test warning notification for "${description}" theme`
            );
            await vscode.window.showErrorMessage(
                `Test error notification for "${description}" theme`
            );
        }, 1000);
    }
}

/**
 * Silent notification strategy for programmatic usage.
 * Useful for testing or batch operations where user feedback isn't needed.
 */
export class SilentNotificationStrategy implements NotificationStrategy {
    readonly enableTestNotifications = false;

    async showSuccessNotification(result: ThemeApplicationResult, description: string): Promise<void> {
        // Silent operation
    }

    async showErrorNotification(error: ThemeApplicationError): Promise<void> {
        // Silent operation
    }
}

/**
 * Creates standard theme application dependencies using VS Code APIs.
 * This is the main entry point for production usage.
 */
export const createVSCodeDependencies = (
    notificationStrategy?: NotificationStrategy
): ThemeApplicationDependencies => {
    const config = vscode.workspace.getConfiguration();
    
    return {
        configuration: new VSCodeConfigurationProvider(config),
        notification: notificationStrategy || new DefaultNotificationStrategy(),
        workspace: {
            hasWorkspaceFolders: Boolean(vscode.workspace.workspaceFolders?.length)
        }
    };
};

/**
 * Triggers a notification style refresh after theme application.
 * Separated as a side effect that can be optionally called.
 */
export const refreshNotificationStyles = (): void => {
    forceNotificationStyleRefresh();
};
