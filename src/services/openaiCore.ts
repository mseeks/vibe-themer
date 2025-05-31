/**
 * Core OpenAI client management with integrated orchestration.
 * Combines pure domain logic with client lifecycle management.
 * 
 * Design Philosophy:
 * - Pure functions for domain logic, state management for orchestration
 * - Rich types that make invalid states unrepresentable
 * - Functional composition with practical state management
 * - Explicit error handling with structured failure information
 */

import * as vscode from 'vscode';
import OpenAI from 'openai';
import { 
    APIKeyState, 
    OpenAIClientState, 
    OpenAIServiceResult, 
    OpenAIServiceError
} from '../types/theme';

/**
 * Determines what action should be taken based on the current API key state.
 * Encodes the business rule: we need a valid API key to proceed with client creation.
 * 
 * @param keyState - Current state of the API key
 * @returns The next action that should be taken
 */
export const determineRequiredAction = (keyState: APIKeyState): 'prompt-user' | 'use-existing' | 'error' => {
    switch (keyState.status) {
        case 'missing':
            return 'prompt-user';
        case 'present':
            return 'use-existing';
        case 'invalid':
            return 'prompt-user';  // Allow user to try a different key
        default:
            // TypeScript ensures this is exhaustive - compilation fails if we miss a case
            const _exhaustive: never = keyState;
            return _exhaustive;
    }
};

/**
 * Creates a client state from an API key and OpenAI client.
 * Transforms low-level client information into our domain model.
 */
export const createReadyClientState = (apiKey: string, client: OpenAI): OpenAIClientState => ({
    status: 'ready',
    apiKey,
    // Future enhancement: extract model from client configuration
    model: undefined
});

/**
 * Creates an error client state with rich context.
 * Ensures errors contain actionable information for users and developers.
 */
export const createErrorClientState = (
    error: OpenAIServiceError, 
    lastApiKey?: string
): OpenAIClientState => ({
    status: 'error',
    error,
    lastApiKey
});

/**
 * Creates a structured success result.
 * Type safety ensures we always provide both data and client state.
 */
export const createSuccessResult = <T>(
    data: T, 
    clientState: OpenAIClientState
): OpenAIServiceResult<T> => ({
    success: true,
    data,
    clientState
});

/**
 * Creates a structured failure result.
 * Ensures failures contain actionable error information and current state.
 */
export const createFailureResult = <T>(
    error: OpenAIServiceError,
    clientState: OpenAIClientState
): OpenAIServiceResult<T> => ({
    success: false,
    error,
    clientState
});

/**
 * Factory function for creating OpenAI service errors.
 * Centralizes error creation to ensure consistency and completeness.
 */
export const createOpenAIServiceError = (
    message: string,
    errorType: OpenAIServiceError['errorType'],
    options: {
        cause?: unknown;
        recoverable?: boolean;
        suggestedAction?: string;
    } = {}
): OpenAIServiceError => ({
    message,
    errorType,
    cause: options.cause,
    recoverable: options.recoverable ?? true,
    suggestedAction: options.suggestedAction
});

/**
 * Determines if a client state represents a usable client.
 * Type-safe way to check if we can proceed with OpenAI operations.
 */
export const isClientReady = (state: OpenAIClientState): state is Extract<OpenAIClientState, { status: 'ready' }> => {
    return state.status === 'ready';
};

/**
 * Extracts the API key from various state representations.
 * Provides a unified way to get the current API key regardless of state.
 */
export const extractApiKey = (keyState: APIKeyState): string | undefined => {
    switch (keyState.status) {
        case 'missing':
            return undefined;
        case 'present':
        case 'invalid':
            return keyState.key;
        default:
            const _exhaustive: never = keyState;
            return _exhaustive;
    }
};

/**
 * Validates that an API key meets basic format requirements.
 * Business rule: OpenAI API keys have a specific format we can validate.
 */
export const validateApiKeyFormat = (apiKey: string): boolean => {
    // OpenAI API keys start with "sk-" and have a specific length
    // This is a basic format check, not authentication validation
    return apiKey.startsWith('sk-') && apiKey.length > 20;
};

/**
 * Creates an API key state from storage retrieval result.
 * Transforms storage API results into our domain model.
 */
export const createApiKeyStateFromStorage = (
    storageResult: string | undefined
): APIKeyState => {
    if (!storageResult) {
        return { status: 'missing', reason: 'never-set' };
    }
    
    if (!validateApiKeyFormat(storageResult)) {
        return { 
            status: 'invalid', 
            key: storageResult, 
            error: 'API key does not match expected format' 
        };
    }
    
    return { 
        status: 'present', 
        key: storageResult, 
        source: 'storage' 
    };
};

/**
 * Creates an API key state from user input.
 * Handles the case where user provides a new API key.
 */
export const createApiKeyStateFromUserInput = (
    userInput: string | undefined
): APIKeyState => {
    if (!userInput) {
        return { status: 'missing', reason: 'deleted' };
    }
    
    if (!validateApiKeyFormat(userInput)) {
        return { 
            status: 'invalid', 
            key: userInput, 
            error: 'API key does not match expected format' 
        };
    }
    
    return { 
        status: 'present', 
        key: userInput, 
        source: 'user-input' 
    };
};

/**
 * The OpenAI API key identifier used in secure storage.
 * Centralized constant to ensure consistency across the application.
 */
const OPENAI_API_KEY_STORAGE_KEY = 'openaiApiKey';

/**
 * Current client state - encapsulated to prevent direct mutation.
 * Business rule: client state should only be modified through controlled operations.
 */
let currentClientState: OpenAIClientState = { status: 'uninitialized' };
let currentClient: OpenAI | undefined;

/**
 * Validates an OpenAI client by testing connectivity.
 */
const validateOpenAIClient = async (client: OpenAI): Promise<boolean> => {
    try {
        await client.models.list();
        return true;
    } catch (error) {
        console.log('OpenAI client validation failed:', error);
        return false;
    }
};

/**
 * Initializes the OpenAI client with comprehensive error handling and user feedback.
 * This is the main entry point that orchestrates the entire initialization process.
 * 
 * Business Logic:
 * - First attempt to use stored API key (better UX - don't prompt unnecessarily)
 * - If no key or invalid key, prompt user for input
 * - Store valid keys for future use
 * - Provide rich feedback for all scenarios
 * 
 * @param context - VS Code extension context for storage and UI access
 * @returns Result indicating success/failure with rich context
 */
export const initializeOpenAIClient = async (
    context: vscode.ExtensionContext
): Promise<OpenAIServiceResult<OpenAI>> => {
    try {
        // Step 1: Check for existing API key in storage
        const storedKey = await context.secrets.get(OPENAI_API_KEY_STORAGE_KEY);
        let keyState = createApiKeyStateFromStorage(storedKey);
        
        // Step 2: Determine what action to take based on current key state
        const requiredAction = determineRequiredAction(keyState);
        
        if (requiredAction === 'prompt-user') {
            // Step 3: Get API key from user if needed
            const userInput = await vscode.window.showInputBox({
                prompt: 'Enter your OpenAI API Key',
                ignoreFocusOut: true,
                password: true,
                placeHolder: 'sk-...',
                validateInput: (value) => {
                    if (!value) return 'API key is required';
                    if (!value.startsWith('sk-')) return 'OpenAI API keys start with "sk-"';
                    if (value.length < 20) return 'API key appears to be too short';
                    return undefined;
                }
            });
            keyState = createApiKeyStateFromUserInput(userInput);
            
            // User cancelled the prompt
            if (keyState.status === 'missing') {
                const error = createOpenAIServiceError(
                    'OpenAI API Key is required for this extension to work',
                    'user-cancelled',
                    { 
                        recoverable: true,
                        suggestedAction: 'Please run the command again and provide your API key'
                    }
                );
                
                currentClientState = createErrorClientState(error);
                await vscode.window.showErrorMessage(error.message, { modal: true });
                return createFailureResult(error, currentClientState);
            }
        }
        
        // Step 4: At this point we should have a valid API key
        const apiKey = extractApiKey(keyState);
        if (!apiKey) {
            const error = createOpenAIServiceError(
                'Unable to obtain valid API key',
                'api-key-missing',
                { 
                    recoverable: true,
                    suggestedAction: 'Please check your API key format and try again'
                }
            );
            
            currentClientState = createErrorClientState(error);
            return createFailureResult(error, currentClientState);
        }
        
        // Step 5: Create and validate the OpenAI client
        const client = new OpenAI({ apiKey });
        const isValid = await validateOpenAIClient(client);
        
        if (!isValid) {
            const error = createOpenAIServiceError(
                'OpenAI API key is invalid or cannot connect to OpenAI services',
                'api-key-invalid',
                { 
                    recoverable: true,
                    suggestedAction: 'Please verify your API key and check your internet connection'
                }
            );
            
            currentClientState = createErrorClientState(error, apiKey);
            await vscode.window.showErrorMessage(error.message, { modal: true });
            return createFailureResult(error, currentClientState);
        }
        
        // Step 6: Store the key if it came from user input (avoid unnecessary storage writes)
        if (keyState.status === 'present' && keyState.source === 'user-input') {
            await context.secrets.store(OPENAI_API_KEY_STORAGE_KEY, apiKey);
            await vscode.window.showInformationMessage('OpenAI API Key stored successfully!', { modal: true });
        }
        
        // Step 7: Update our state and return success
        currentClient = client;
        currentClientState = createReadyClientState(apiKey, client);
        
        return createSuccessResult(client, currentClientState);
        
    } catch (error) {
        // Handle unexpected errors with rich context
        const serviceError = error instanceof Error && 'errorType' in error
            ? error as any  // It's already our domain error
            : createOpenAIServiceError(
                'Unexpected error during OpenAI client initialization',
                'client-creation-failed',
                { 
                    cause: error,
                    recoverable: true,
                    suggestedAction: 'Please try again or restart VS Code'
                }
            );
        
        currentClientState = createErrorClientState(serviceError);
        return createFailureResult(serviceError, currentClientState);
    }
};

/**
 * Ensures the OpenAI client is available and ready for use.
 * If not initialized, attempts initialization. If already initialized, returns existing client.
 * 
 * Business Rule: Always provide a client when possible, initialize transparently when needed.
 * 
 * @param context - VS Code extension context for initialization if needed
 * @returns Result with client or detailed error information
 */
export const ensureOpenAIClient = async (
    context: vscode.ExtensionContext
): Promise<OpenAIServiceResult<OpenAI>> => {
    // If we already have a ready client, return it immediately
    if (isClientReady(currentClientState) && currentClient) {
        return createSuccessResult(currentClient, currentClientState);
    }
    
    // Otherwise, initialize the client
    return await initializeOpenAIClient(context);
};

/**
 * Gets the current OpenAI client if available.
 * Returns undefined if not initialized - this forces callers to handle the uninitialized case.
 * 
 * Design Decision: Return undefined rather than throwing to make the uninitialized state explicit.
 */
export const getCurrentOpenAIClient = (): OpenAI | undefined => {
    return isClientReady(currentClientState) ? currentClient : undefined;
};

/**
 * Gets the current client state for inspection.
 * Useful for displaying status information or debugging.
 */
export const getCurrentClientState = (): OpenAIClientState => {
    return currentClientState;
};

/**
 * Resets the OpenAI client state and clears stored credentials.
 * Useful for switching API keys or troubleshooting connection issues.
 * 
 * @param context - VS Code extension context for storage access
 * @returns Result indicating success/failure of the reset operation
 */
export const resetOpenAIClient = async (
    context: vscode.ExtensionContext
): Promise<OpenAIServiceResult<void>> => {
    try {
        // Clear stored API key
        await context.secrets.delete(OPENAI_API_KEY_STORAGE_KEY);
        
        // Reset internal state
        currentClient = undefined;
        currentClientState = { status: 'uninitialized' };
        
        await vscode.window.showInformationMessage('OpenAI client reset successfully', { modal: true });
        
        return createSuccessResult(undefined, currentClientState);
        
    } catch (error) {
        const serviceError = createOpenAIServiceError(
            'Failed to reset OpenAI client',
            'storage-error',
            { 
                cause: error,
                recoverable: true,
                suggestedAction: 'Try restarting VS Code or manually clearing extension data'
            }
        );
        
        currentClientState = createErrorClientState(serviceError);
        return createFailureResult(serviceError, currentClientState);
    }
};
