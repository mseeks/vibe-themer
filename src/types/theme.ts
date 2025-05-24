/**
 * Domain types for theme application in VS Code.
 * These types encode business rules and make invalid states unrepresentable.
 */

import * as vscode from 'vscode';

/**
 * Represents a syntax token color rule with strong typing.
 * The scope determines what code elements this applies to.
 */
export interface TokenColorRule {
    readonly scope: string | readonly string[];
    readonly settings: {
        readonly foreground?: string;
        readonly background?: string;
        readonly fontStyle?: 'italic' | 'bold' | 'underline' | 'none' | string;
    };
}

/**
 * A complete theme customization containing both UI colors and syntax highlighting.
 * This is the core domain object representing what we want to apply.
 */
export interface ThemeCustomizations {
    readonly colorCustomizations: Record<string, string>;
    readonly tokenColors: readonly TokenColorRule[];
    readonly description: string;
}

/**
 * Configuration scope determines where theme settings are persisted.
 * The type system enforces that we handle both workspace and global scenarios.
 */
export type ConfigurationScope = 
    | { readonly type: 'workspace'; readonly target: vscode.ConfigurationTarget.Workspace }
    | { readonly type: 'global'; readonly target: vscode.ConfigurationTarget.Global }
    | { readonly type: 'both'; readonly primary: vscode.ConfigurationTarget; readonly fallback: vscode.ConfigurationTarget };

/**
 * Result of a theme application operation.
 * Success contains the applied scope, failure contains actionable error information.
 */
export type ThemeApplicationResult = 
    | { readonly success: true; readonly appliedScope: ConfigurationScope }
    | { readonly success: false; readonly error: ThemeApplicationError };

/**
 * Structured error information for theme application failures.
 * Provides both user-facing messages and technical details for debugging.
 */
export interface ThemeApplicationError {
    readonly message: string;
    readonly cause?: unknown;
    readonly recoverable: boolean;
    readonly suggestedAction?: string;
}

/**
 * Strategy for providing user feedback after theme application.
 * Separates the concern of notification from the core business logic.
 */
export interface NotificationStrategy {
    readonly showSuccessNotification: (result: ThemeApplicationResult, description: string) => Promise<void>;
    readonly showErrorNotification: (error: ThemeApplicationError) => Promise<void>;
    readonly enableTestNotifications: boolean;
}

/**
 * Abstraction over VS Code's configuration API.
 * Enables testing and provides a cleaner interface for theme operations.
 */
export interface ConfigurationProvider {
    readonly update: (
        section: string, 
        value: unknown, 
        target: vscode.ConfigurationTarget
    ) => Promise<void>;
    readonly get: <T>(section: string) => T | undefined;
}

/**
 * Dependencies required for theme application.
 * Makes dependencies explicit and enables testing/mocking.
 */
export interface ThemeApplicationDependencies {
    readonly configuration: ConfigurationProvider;
    readonly notification: NotificationStrategy;
    readonly workspace: {
        readonly hasWorkspaceFolders: boolean;
    };
}
