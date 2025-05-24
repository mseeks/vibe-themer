/**
 * VS Code adapter layer for OpenAI service.
 * Handles the imperative VS Code APIs and translates them to our functional domain.
 * 
 * Design Philosophy:
 * - Isolate side effects to this adapter layer
 * - Provide clean interfaces that hide VS Code complexity
 * - Enable testing through dependency injection
 * - Transform VS Code APIs into domain-friendly abstractions
 */

import * as vscode from 'vscode';
import OpenAI from 'openai';
import { 
    SecretStorageProvider, 
    UserInteractionProvider, 
    OpenAIClientFactory,
    OpenAIServiceDependencies,
    OpenAIServiceError
} from '../types/theme';
import { createOpenAIServiceError } from './openaiCore';

/**
 * VS Code secret storage provider implementation.
 * Wraps the VS Code secret storage API with error handling and domain context.
 */
export class VSCodeSecretStorageProvider implements SecretStorageProvider {
    constructor(private readonly secrets: vscode.SecretStorage) {}

    async get(key: string): Promise<string | undefined> {
        try {
            return await this.secrets.get(key);
        } catch (error) {
            // Transform storage errors into domain errors for better handling
            throw createOpenAIServiceError(
                'Failed to retrieve API key from secure storage',
                'storage-error',
                { 
                    cause: error, 
                    recoverable: true,
                    suggestedAction: 'Try restarting VS Code or re-entering your API key'
                }
            );
        }
    }

    async store(key: string, value: string): Promise<void> {
        try {
            await this.secrets.store(key, value);
        } catch (error) {
            throw createOpenAIServiceError(
                'Failed to store API key in secure storage',
                'storage-error',
                { 
                    cause: error, 
                    recoverable: true,
                    suggestedAction: 'Check VS Code permissions and try again'
                }
            );
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.secrets.delete(key);
        } catch (error) {
            throw createOpenAIServiceError(
                'Failed to delete API key from secure storage',
                'storage-error',
                { 
                    cause: error, 
                    recoverable: true,
                    suggestedAction: 'Try manually clearing extension data'
                }
            );
        }
    }
}

/**
 * VS Code user interaction provider implementation.
 * Wraps VS Code's UI APIs with domain-appropriate interfaces and error handling.
 */
export class VSCodeUserInteractionProvider implements UserInteractionProvider {
    async promptForAPIKey(): Promise<string | undefined> {
        try {
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your OpenAI API Key',
                ignoreFocusOut: true,  // Keep dialog open when focus moves - better UX
                password: true,        // Mask the input for security
                placeHolder: 'sk-...',
                validateInput: (value) => {
                    // Provide immediate feedback on format validity
                    if (!value) {
                        return 'API key is required';
                    }
                    if (!value.startsWith('sk-')) {
                        return 'OpenAI API keys start with "sk-"';
                    }
                    if (value.length < 20) {
                        return 'API key appears to be too short';
                    }
                    return null; // Valid
                }
            });

            return apiKey;
        } catch (error) {
            // If the UI interaction fails, we want to know about it but not crash
            console.error('Failed to prompt for API key:', error);
            return undefined;
        }
    }

    async showSuccessMessage(message: string): Promise<void> {
        await vscode.window.showInformationMessage(message);
    }

    async showErrorMessage(message: string): Promise<void> {
        await vscode.window.showErrorMessage(message);
    }

    async showInformationMessage(message: string): Promise<void> {
        await vscode.window.showInformationMessage(message);
    }
}

/**
 * OpenAI client factory implementation.
 * Handles OpenAI SDK instantiation and validation with proper error transformation.
 */
export class StandardOpenAIClientFactory implements OpenAIClientFactory {
    async createClient(apiKey: string): Promise<OpenAI> {
        try {
            const client = new OpenAI({ 
                apiKey,
                // Future enhancement: add custom configuration
                timeout: 30000, // 30 second timeout for requests
            });
            
            return client;
        } catch (error) {
            throw createOpenAIServiceError(
                'Failed to create OpenAI client',
                'client-creation-failed',
                { 
                    cause: error, 
                    recoverable: true,
                    suggestedAction: 'Verify your API key and try again'
                }
            );
        }
    }

    async validateClient(client: OpenAI): Promise<boolean> {
        try {
            // Test the client with a minimal request to verify the API key works
            // This is a lightweight way to validate without consuming significant quota
            await client.models.list();
            return true;
        } catch (error) {
            // API key is invalid or there's a network issue
            // We don't throw here because this is validation, not creation
            console.log('OpenAI client validation failed:', error);
            return false;
        }
    }
}

/**
 * Silent user interaction provider for testing or programmatic usage.
 * Useful when we don't want to show dialogs during automated operations.
 */
export class SilentUserInteractionProvider implements UserInteractionProvider {
    constructor(
        private readonly mockApiKey?: string,
        private readonly shouldLogMessages: boolean = false
    ) {}

    async promptForAPIKey(): Promise<string | undefined> {
        if (this.shouldLogMessages) {
            console.log('Silent mode: API key prompt suppressed');
        }
        return this.mockApiKey;
    }

    async showSuccessMessage(message: string): Promise<void> {
        if (this.shouldLogMessages) {
            console.log('Success:', message);
        }
    }

    async showErrorMessage(message: string): Promise<void> {
        if (this.shouldLogMessages) {
            console.error('Error:', message);
        }
    }

    async showInformationMessage(message: string): Promise<void> {
        if (this.shouldLogMessages) {
            console.log('Info:', message);
        }
    }
}

/**
 * Creates standard OpenAI service dependencies using VS Code APIs.
 * This is the main entry point for production usage.
 * 
 * @param context - VS Code extension context for accessing secrets
 * @param userInteractionProvider - Optional custom interaction provider
 * @returns Complete dependency set for OpenAI service operations
 */
export const createVSCodeOpenAIDependencies = (
    context: vscode.ExtensionContext,
    userInteractionProvider?: UserInteractionProvider
): OpenAIServiceDependencies => ({
    secretStorage: new VSCodeSecretStorageProvider(context.secrets),
    userInteraction: userInteractionProvider || new VSCodeUserInteractionProvider(),
    clientFactory: new StandardOpenAIClientFactory()
});

/**
 * Creates silent dependencies for testing or background operations.
 * Useful when you need to interact with OpenAI without user prompts.
 */
export const createSilentOpenAIDependencies = (
    context: vscode.ExtensionContext,
    mockApiKey?: string,
    shouldLog: boolean = false
): OpenAIServiceDependencies => ({
    secretStorage: new VSCodeSecretStorageProvider(context.secrets),
    userInteraction: new SilentUserInteractionProvider(mockApiKey, shouldLog),
    clientFactory: new StandardOpenAIClientFactory()
});
