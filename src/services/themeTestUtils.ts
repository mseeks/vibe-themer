/**
 * Test utilities and examples for the refactored theme service.
 * Demonstrates the functional approach and domain-driven design principles.
 */

import * as vscode from 'vscode';
import { 
    ThemeApplicationDependencies, 
    ConfigurationProvider, 
    NotificationStrategy,
    ThemeApplicationResult,
    ThemeApplicationError,
    TokenColorRule
} from '../types/theme';
import { applyThemeCustomizations } from './themeApplication';
import { SilentNotificationStrategy } from './themeAdapters';

/**
 * Mock configuration provider for testing.
 * Demonstrates how dependency injection enables testing of pure business logic.
 */
class MockConfigurationProvider implements ConfigurationProvider {
    private storage = new Map<string, unknown>();
    private updateLog: Array<{ section: string; value: unknown; target: vscode.ConfigurationTarget }> = [];

    async update(section: string, value: unknown, target: vscode.ConfigurationTarget): Promise<void> {
        this.storage.set(`${section}:${target}`, value);
        this.updateLog.push({ section, value, target });
    }

    get<T>(section: string): T | undefined {
        return this.storage.get(section) as T;
    }

    getUpdateLog() {
        return [...this.updateLog];
    }

    getStoredValue(section: string, target: vscode.ConfigurationTarget) {
        return this.storage.get(`${section}:${target}`);
    }
}

/**
 * Test notification strategy that captures calls for verification.
 */
class TestNotificationStrategy implements NotificationStrategy {
    readonly enableTestNotifications = false;
    private notifications: Array<{ type: 'success' | 'error'; data: any }> = [];

    async showSuccessNotification(result: ThemeApplicationResult, description: string): Promise<void> {
        this.notifications.push({ type: 'success', data: { result, description } });
    }

    async showErrorNotification(error: ThemeApplicationError): Promise<void> {
        this.notifications.push({ type: 'error', data: error });
    }

    getNotifications() {
        return [...this.notifications];
    }

    clear() {
        this.notifications = [];
    }
}

/**
 * Factory for creating test dependencies with mocked implementations.
 */
export const createTestDependencies = (
    hasWorkspaceFolders: boolean = false
): { 
    deps: ThemeApplicationDependencies; 
    mocks: { 
        config: MockConfigurationProvider; 
        notification: TestNotificationStrategy; 
    } 
} => {
    const config = new MockConfigurationProvider();
    const notification = new TestNotificationStrategy();

    const deps: ThemeApplicationDependencies = {
        configuration: config,
        notification,
        workspace: { hasWorkspaceFolders }
    };

    return { deps, mocks: { config, notification } };
};

/**
 * Example usage demonstrating the elegant API and error handling.
 */
export const demonstrateThemeApplication = async (): Promise<void> => {
    // Example 1: Basic theme application with rich error handling
    const oceanTheme = {
        "editor.background": "#1e3a5f",
        "editor.foreground": "#e0f2ff",
        "activityBar.background": "#2d5a87",
        "statusBar.background": "#1a4b73"
    };

    const oceanTokens: TokenColorRule[] = [
        {
            scope: ["comment", "punctuation.definition.comment"],
            settings: {
                foreground: "#7fb3d3",
                fontStyle: "italic"
            }
        },
        {
            scope: ["keyword", "storage.type"],
            settings: {
                foreground: "#4a9eff",
                fontStyle: "bold"
            }
        }
    ];

    // The refined API handles all complexity internally
    const result = await applyThemeCustomizations(
        oceanTheme,
        oceanTokens,
        "Ocean Depths"
    );

    if (result.success) {
        console.log(`Theme applied successfully to: ${result.appliedScope.type}`);
    } else {
        console.error(`Theme application failed: ${result.error.message}`);
        if (result.error.suggestedAction) {
            console.log(`Suggested action: ${result.error.suggestedAction}`);
        }
    }
};

/**
 * Advanced example showing custom notification strategy.
 */
export const demonstrateCustomNotificationStrategy = async (): Promise<void> => {
    const { deps, mocks } = createTestDependencies(true);

    // Custom notification strategy for batch operations
    class BatchNotificationStrategy extends SilentNotificationStrategy {
        private batchResults: ThemeApplicationResult[] = [];

        async showSuccessNotification(result: ThemeApplicationResult, description: string): Promise<void> {
            this.batchResults.push(result);
        }

        getBatchSummary() {
            const successful = this.batchResults.filter(r => r.success).length;
            const failed = this.batchResults.filter(r => !r.success).length;
            return { successful, failed, total: this.batchResults.length };
        }
    }

    const batchNotification = new BatchNotificationStrategy();
    const customDeps = { ...deps, notification: batchNotification };

    // Apply multiple themes silently
    const themes = [
        { colors: { "editor.background": "#1e1e1e" }, description: "Dark Theme" },
        { colors: { "editor.background": "#ffffff" }, description: "Light Theme" },
        { colors: { "editor.background": "#2d1b69" }, description: "Purple Theme" }
    ];

    for (const theme of themes) {
        await applyThemeCustomizations(
            theme.colors,
            [],
            theme.description,
            customDeps
        );
    }

    const summary = batchNotification.getBatchSummary();
    console.log(`Batch operation completed: ${summary.successful}/${summary.total} successful`);
};

/**
 * Example demonstrating validation and error recovery.
 */
export const demonstrateValidationAndErrorHandling = async (): Promise<void> => {
    // Invalid theme with malformed colors
    const invalidTheme = {
        "editor.background": "not-a-color",
        "editor.foreground": "#gggggg",  // Invalid hex
        "statusBar.background": "#123"   // Too short
    };

    const result = await applyThemeCustomizations(
        invalidTheme,
        [],
        "Invalid Theme Test"
    );

    if (!result.success) {
        console.log("Validation caught invalid theme as expected:");
        console.log(`- Error: ${result.error.message}`);
        console.log(`- Recoverable: ${result.error.recoverable}`);
        console.log(`- Suggested action: ${result.error.suggestedAction}`);
    }
};

/**
 * Example demonstrating support for alpha transparency colors.
 */
export const demonstrateAlphaTransparencySupport = async (): Promise<void> => {
    // Valid theme with alpha transparency colors (the ones that were causing the error)
    const alphaTheme = {
        "diffEditor.insertedTextBackground": "#00ff0020",     // 8-digit with alpha
        "diffEditor.removedTextBackground": "#ff000020",      // 8-digit with alpha
        "scrollbar.shadow": "#00000080",                      // 8-digit with alpha
        "scrollbarSlider.background": "#ffffff40",            // 8-digit with alpha
        "scrollbarSlider.hoverBackground": "#ffffff60",       // 8-digit with alpha
        "scrollbarSlider.activeBackground": "#ffffff80",      // 8-digit with alpha
        "widget.shadow": "#00000030",                         // 8-digit with alpha
        "editor.background": "#f00",                          // 3-digit shorthand
        "editor.foreground": "#ffffff",                       // 6-digit standard
        "statusBar.background": "transparent"                 // CSS keyword
    };

    const result = await applyThemeCustomizations(
        alphaTheme,
        [],
        "Alpha Transparency Theme Test"
    );

    if (result.success) {
        console.log("✅ Alpha transparency colors validation passed!");
        console.log(`- Applied to scope: ${result.appliedScope.type}`);
    } else {
        console.log("❌ Alpha transparency colors validation failed:");
        console.log(`- Error: ${result.error.message}`);
        console.log(`- Recoverable: ${result.error.recoverable}`);
        console.log(`- Suggested action: ${result.error.suggestedAction}`);
    }
};
