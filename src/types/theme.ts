/**
 * Domain types for theme application in VS Code.
 * These types encode business rules and make invalid states unrepresentable.
 */

import * as vscode from 'vscode';
import OpenAI from 'openai';

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

// =============================================================================
// OpenAI Domain Types
// =============================================================================

/**
 * Domain types for OpenAI client management.
 * These types encode business rules and make invalid states unrepresentable.
 */

/**
 * Represents the state of an API key in the system.
 * Encodes the business rule that we must know the provenance and validity of our API key.
 */
export type APIKeyState = 
    | { readonly status: 'missing'; readonly reason?: 'never-set' | 'deleted' }
    | { readonly status: 'present'; readonly key: string; readonly source: 'storage' | 'user-input' }
    | { readonly status: 'invalid'; readonly key: string; readonly error: string };

/**
 * State of the OpenAI client connection.
 * Type safety ensures we can only use a client when it's in a valid state.
 */
export type OpenAIClientState = 
    | { readonly status: 'uninitialized' }
    | { readonly status: 'ready'; readonly apiKey: string; readonly model?: string }
    | { readonly status: 'error'; readonly error: OpenAIServiceError; readonly lastApiKey?: string };

/**
 * Result of OpenAI service operations.
 * Provides structured success/failure information with actionable context.
 */
export type OpenAIServiceResult<T = void> = 
    | { readonly success: true; readonly data: T; readonly clientState: OpenAIClientState }
    | { readonly success: false; readonly error: OpenAIServiceError; readonly clientState: OpenAIClientState };

/**
 * Structured error information for OpenAI service failures.
 * Provides both user-facing messages and technical details for debugging.
 */
export interface OpenAIServiceError {
    readonly message: string;          // User-facing error description
    readonly cause?: unknown;          // Technical details for debugging  
    readonly recoverable: boolean;     // Can the user retry this operation?
    readonly suggestedAction?: string; // What should the user do next?
    readonly errorType: 'api-key-missing' | 'api-key-invalid' | 'client-creation-failed' | 'storage-error' | 'user-cancelled';
}

/**
 * Abstraction over secret storage for API keys.
 * Enables testing and provides a cleaner interface for key management operations.
 */
export interface SecretStorageProvider {
    readonly get: (key: string) => Promise<string | undefined>;
    readonly store: (key: string, value: string) => Promise<void>;
    readonly delete: (key: string) => Promise<void>;
}

/**
 * Abstraction over user interaction for API key collection.
 * Separates UI concerns from business logic and enables testing.
 */
export interface UserInteractionProvider {
    readonly promptForAPIKey: () => Promise<string | undefined>;
    readonly showSuccessMessage: (message: string) => Promise<void>;
    readonly showErrorMessage: (message: string) => Promise<void>;
    readonly showInformationMessage: (message: string) => Promise<void>;
}

/**
 * Factory interface for creating OpenAI clients.
 * Abstracts the OpenAI SDK and enables dependency injection for testing.
 */
export interface OpenAIClientFactory {
    readonly createClient: (apiKey: string) => Promise<OpenAI>;
    readonly validateClient: (client: OpenAI) => Promise<boolean>;
}

/**
 * Dependencies required for OpenAI service operations.
 * Makes dependencies explicit and enables comprehensive testing.
 */
export interface OpenAIServiceDependencies {
    readonly secretStorage: SecretStorageProvider;
    readonly userInteraction: UserInteractionProvider;
    readonly clientFactory: OpenAIClientFactory;
}
