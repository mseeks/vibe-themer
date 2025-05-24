/**
 * OpenAI Service - Elegant orchestration of OpenAI client management.
 * 
 * This module provides a refined interface for managing OpenAI client lifecycle.
 * It embodies functional programming principles with domain-driven design, creating
 * a beautiful separation between business logic and infrastructure concerns.
 * 
 * Design Philosophy:
 * - Pure functions for domain logic, side effects isolated to adapters
 * - Rich type system that makes invalid states unrepresentable  
 * - Functional composition over imperative control flow
 * - Explicit error handling with structured failure information
 * - Dependency injection for testability and flexibility
 */

import * as vscode from 'vscode';
import OpenAI from 'openai';
import { getSelectedOpenAIModel } from '../commands/modelSelectCommand';
import { 
    initializeOpenAIClientLegacy, 
    getOpenAIClientLegacy,
    ensureOpenAIClient as ensureOpenAIClientCore,
    getCurrentClientState,
    resetOpenAIClient as resetOpenAIClientCore
} from './openaiApplication';
import { createVSCodeOpenAIDependencies } from './openaiAdapters';

/**
 * Initializes the OpenAI client with comprehensive error handling and user feedback.
 * 
 * This is the main public API that maintains backward compatibility while leveraging
 * our new functional architecture under the hood. The function transforms the legacy
 * interface into our refined domain model and delegates to the pure business logic.
 * 
 * @param context - The extension context used to access secrets storage
 * @returns A boolean indicating whether initialization was successful
 */
export async function initializeOpenAIClient(context: vscode.ExtensionContext): Promise<boolean> {
    // Create dependencies using VS Code APIs
    const dependencies = createVSCodeOpenAIDependencies(context);
    
    // Delegate to our refined implementation with legacy compatibility layer
    return await initializeOpenAIClientLegacy(dependencies);
}

/**
 * Get the current OpenAI client instance.
 * 
 * Returns the active client if initialized and ready, or undefined if not available.
 * This function maintains the simple interface while benefiting from the improved
 * state management of our new architecture.
 * 
 * @returns The current OpenAI client or undefined if not initialized
 */
export function getOpenAIClient(): OpenAI | undefined {
    return getOpenAIClientLegacy();
}

/**
 * Ensures the OpenAI client is initialized and available.
 * 
 * If not initialized, prompts the user for the API key and initializes the client.
 * This function provides the same interface as before but with improved error handling,
 * validation, and user experience through our new architecture.
 * 
 * @param context - The extension context used for initialization if needed
 * @returns The OpenAI client instance or undefined if initialization fails
 */
export async function ensureOpenAIClient(context: vscode.ExtensionContext): Promise<OpenAI | undefined> {
    // Create dependencies for the operation
    const dependencies = createVSCodeOpenAIDependencies(context);
    
    // Use our new architecture with rich error handling
    const result = await ensureOpenAIClientCore(dependencies);
    
    // Transform result to legacy format for backward compatibility
    if (result.success) {
        return result.data;
    } else {
        // The error has already been shown to the user by the application layer
        // We just need to return undefined to maintain the legacy contract
        return undefined;
    }
}

/**
 * Gets the current state of the OpenAI client for debugging or status display.
 * 
 * This is a new function that exposes the rich state information from our
 * improved architecture. Useful for commands that need to show client status.
 * 
 * @returns Current client state with detailed information
 */
export function getOpenAIClientState() {
    return getCurrentClientState();
}

/**
 * Resets the OpenAI client and clears stored credentials.
 * 
 * This is a new function that leverages our improved architecture to provide
 * clean reset functionality with proper error handling.
 * 
 * @param context - The extension context for accessing storage
 * @returns Promise that resolves when reset is complete
 */
export async function resetOpenAIClient(context: vscode.ExtensionContext): Promise<void> {
    const dependencies = createVSCodeOpenAIDependencies(context);
    const result = await resetOpenAIClientCore(dependencies);
    
    // For the public API, we don't need to return the result
    // Errors are handled internally and shown to the user
    if (!result.success) {
        // Log for debugging but don't throw - the user has already been notified
        console.error('OpenAI client reset failed:', result.error);
    }
}
