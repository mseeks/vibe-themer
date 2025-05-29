/**
 * High-level OpenAI service application orchestrator.
 * Composes domain logic with VS Code adapters to provide the main API.
 * 
 * Design Philosophy:
 * - Functional composition of smaller, focused operations
 * - Explicit error handling with rich context
 * - Separation of concerns between domain logic and infrastructure
 * - Type safety that prevents invalid operations
 */

import OpenAI from 'openai';
import { 
    APIKeyState,
    OpenAIClientState,
    OpenAIServiceResult,
    OpenAIServiceDependencies
} from '../types/theme';
import {
    determineRequiredAction,
    createReadyClientState,
    createErrorClientState,
    createSuccessResult,
    createFailureResult,
    createOpenAIServiceError,
    createApiKeyStateFromStorage,
    createApiKeyStateFromUserInput,
    isClientReady,
    extractApiKey
} from './openaiCore';

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
 * Initializes the OpenAI client with comprehensive error handling and user feedback.
 * This is the main entry point that orchestrates the entire initialization process.
 * 
 * Business Logic:
 * - First attempt to use stored API key (better UX - don't prompt unnecessarily)
 * - If no key or invalid key, prompt user for input
 * - Store valid keys for future use
 * - Provide rich feedback for all scenarios
 * 
 * @param dependencies - Injected dependencies for storage, UI, and client creation
 * @returns Result indicating success/failure with rich context
 */
export const initializeOpenAIClient = async (
    dependencies: OpenAIServiceDependencies
): Promise<OpenAIServiceResult<OpenAI>> => {
    try {
        // Step 1: Check for existing API key in storage
        const storedKey = await dependencies.secretStorage.get(OPENAI_API_KEY_STORAGE_KEY);
        let keyState = createApiKeyStateFromStorage(storedKey);
        
        // Step 2: Determine what action to take based on current key state
        const requiredAction = determineRequiredAction(keyState);
        
        if (requiredAction === 'prompt-user') {
            // Step 3: Get API key from user if needed
            const userInput = await dependencies.userInteraction.promptForAPIKey();
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
                await dependencies.userInteraction.showErrorMessage(error.message);
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
        const client = await dependencies.clientFactory.createClient(apiKey);
        const isValid = await dependencies.clientFactory.validateClient(client);
        
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
            await dependencies.userInteraction.showErrorMessage(error.message);
            return createFailureResult(error, currentClientState);
        }
        
        // Step 6: Store the key if it came from user input (avoid unnecessary storage writes)
        if (keyState.status === 'present' && keyState.source === 'user-input') {
            await dependencies.secretStorage.store(OPENAI_API_KEY_STORAGE_KEY, apiKey);
            await dependencies.userInteraction.showSuccessMessage('OpenAI API Key stored successfully!');
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
 * @param dependencies - Injected dependencies for initialization if needed
 * @returns Result with client or detailed error information
 */
export const ensureOpenAIClient = async (
    dependencies: OpenAIServiceDependencies
): Promise<OpenAIServiceResult<OpenAI>> => {
    // If we already have a ready client, return it immediately
    if (isClientReady(currentClientState) && currentClient) {
        return createSuccessResult(currentClient, currentClientState);
    }
    
    // Otherwise, initialize the client
    return await initializeOpenAIClient(dependencies);
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
 * @param dependencies - Dependencies for storage and user interaction
 * @returns Result indicating success/failure of the reset operation
 */
export const resetOpenAIClient = async (
    dependencies: OpenAIServiceDependencies
): Promise<OpenAIServiceResult<void>> => {
    try {
        // Clear stored API key
        await dependencies.secretStorage.delete(OPENAI_API_KEY_STORAGE_KEY);
        
        // Reset internal state
        currentClient = undefined;
        currentClientState = { status: 'uninitialized' };
        
        await dependencies.userInteraction.showInformationMessage('OpenAI client reset successfully');
        
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


