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
 * Represents the current state of VS Code theme customizations.
 * This captures what's currently applied so we can iterate on it.
 */
export interface CurrentThemeState {
    readonly colorCustomizations: Record<string, string>;
    readonly tokenColorCustomizations: Record<string, unknown>;
    readonly hasCustomizations: boolean;
    readonly scope: 'workspace' | 'global' | 'both';
}

/**
 * Result of reading current theme state.
 * Success contains the current state, failure contains actionable error information.
 */
export type CurrentThemeResult = 
    | { readonly success: true; readonly state: CurrentThemeState }
    | { readonly success: false; readonly error: ThemeApplicationError };

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
