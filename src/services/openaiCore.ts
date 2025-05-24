/**
 * Core domain logic for OpenAI client management.
 * Pure functions that encode business rules without side effects.
 * 
 * Design Philosophy:
 * - Pure functions that can be tested in isolation
 * - Rich types that make invalid states unrepresentable
 * - Business logic separated from infrastructure concerns
 * - Functional composition over imperative control flow
 */

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
