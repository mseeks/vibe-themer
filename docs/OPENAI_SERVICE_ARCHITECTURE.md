# OpenAI Service Architecture

## Overview

The OpenAI service has been completely refactored following principles of functional programming, domain-driven design, and precision engineering. This document showcases the new architecture and demonstrates how it embodies the same elegant patterns established in our theme service refactoring.

## Architecture Layers

### 1. Domain Core (`openaiCore.ts`)
Pure business logic with no side effects:

```typescript
// Pure functions that encode business rules
export const isValidAPIKey = (key: string): boolean => 
    typeof key === 'string' && key.trim().length > 0 && key.startsWith('sk-');

export const determineAPIKeyState = (key: string | undefined): APIKeyState => 
    !key ? { status: 'missing' } 
    : isValidAPIKey(key) ? { status: 'valid', key } 
    : { status: 'invalid', key, error: 'API key must start with "sk-" and be non-empty' };

// Rich result types that make impossible states impossible
export const createServiceResult = <T>(
    success: boolean, 
    data?: T, 
    error?: OpenAIServiceError, 
    clientState?: OpenAIClientState
): OpenAIServiceResult<T> => // ... implementation
```

**Why this matters:**
- **Testability**: Pure functions are trivial to test with no mocking required
- **Reliability**: No hidden dependencies or side effects to debug
- **Composability**: Functions combine elegantly to build complex workflows

### 2. Adapter Layer (`openaiAdapters.ts`)
VS Code API integrations with clean interfaces:

```typescript
// Clean abstraction over VS Code secret storage
export class VSCodeSecretStorageProvider implements SecretStorageProvider {
    constructor(private readonly secrets: vscode.SecretStorage) {}
    
    readonly get = async (key: string): Promise<string | undefined> => 
        await this.secrets.get(key);
    
    readonly store = async (key: string, value: string): Promise<void> => 
        await this.secrets.store(key, value);
    
    readonly delete = async (key: string): Promise<void> => 
        await this.secrets.delete(key);
}

// Factory for creating all VS Code dependencies
export const createVSCodeOpenAIDependencies = (
    context: vscode.ExtensionContext
): OpenAIServiceDependencies => ({
    secretStorage: new VSCodeSecretStorageProvider(context.secrets),
    userInteraction: new VSCodeUserInteractionProvider(),
    clientFactory: new StandardOpenAIClientFactory()
});
```

**Why this matters:**
- **Dependency Injection**: Easy to swap implementations for testing
- **Single Responsibility**: Each adapter has one clear purpose
- **Interface Segregation**: Small, focused interfaces

### 3. Application Layer (`openaiApplication.ts`)
Orchestrates business workflows:

```typescript
// Rich workflow orchestration with comprehensive error handling
export async function initializeOpenAIClientWorkflow(
    dependencies: OpenAIServiceDependencies
): Promise<OpenAIServiceResult<OpenAI>> {
    const keyState = determineAPIKeyState(await dependencies.secretStorage.get(API_KEY_STORAGE_KEY));
    
    return await match(keyState)
        .with({ status: 'valid' }, async ({ key }) => {
            const clientResult = await createOpenAIClientSafely(key, dependencies.clientFactory);
            return clientResult.success 
                ? createServiceResult(true, clientResult.data, undefined, { status: 'ready', apiKey: key })
                : createServiceResult(false, undefined, clientResult.error, { status: 'error', error: clientResult.error });
        })
        .with({ status: 'missing' }, async () => {
            const promptResult = await promptForAPIKeyWithFallbacks(dependencies);
            // ... handle result
        })
        .with({ status: 'invalid' }, async ({ error }) => {
            // ... handle invalid key
        })
        .exhaustive();
}
```

**Why this matters:**
- **Exhaustive Pattern Matching**: All cases handled, no forgotten edge cases
- **Workflow Clarity**: Business processes are clearly expressed
- **Error Recovery**: Sophisticated fallback strategies

### 4. Public API (`openaiService.ts`)
Backward-compatible interface:

```typescript
// Legacy interface maintained for smooth migration
export async function ensureOpenAIClient(context: vscode.ExtensionContext): Promise<OpenAI | undefined> {
    const dependencies = createVSCodeOpenAIDependencies(context);
    const result = await ensureOpenAIClientCore(dependencies);
    
    return result.success ? result.data : undefined;
}

// New enhanced interface available for advanced use cases
export function getOpenAIClientState() {
    return getCurrentClientState();
}
```

## Rich Type System

The refactored service uses discriminated unions and precise types to eliminate entire classes of bugs:

```typescript
// Makes invalid states unrepresentable
export type APIKeyState = 
    | { readonly status: 'missing' }
    | { readonly status: 'valid'; readonly key: string }
    | { readonly status: 'invalid'; readonly key: string; readonly error: string };

// Structured error information with actionable context
export interface OpenAIServiceError {
    readonly message: string;          // User-facing error description
    readonly cause?: unknown;          // Technical details for debugging  
    readonly recoverable: boolean;     // Can the user retry this operation?
    readonly suggestedAction?: string; // What should the user do next?
    readonly errorType: 'api-key-missing' | 'api-key-invalid' | 'client-creation-failed' | 'storage-error' | 'user-cancelled';
}
```

## Integration Examples

### Theme Generation Service Integration

The theme generation service demonstrates how other components can leverage the new architecture:

```typescript
export async function runThemeGenerationWorkflow(
    context: vscode.ExtensionContext,
    lastGeneratedThemeRef: { current?: any }
) {
    // Enhanced error handling and state inspection
    const openai = await ensureOpenAIClient(context);
    if (!openai) {
        const clientState = getOpenAIClientState();
        if (clientState.status === 'error') {
            console.error('Theme generation aborted due to OpenAI client error:', clientState.error);
        }
        return;
    }

    // ... rest of workflow with enhanced error categorization
    } catch (error: any) {
        const isNetworkError = error.message.includes('network');
        const isAPIError = error.message.includes('API');
        const isParsingError = error.message.includes('parse');

        let errorPrefix: string;
        let suggestedAction: string | undefined;

        if (isNetworkError) {
            errorPrefix = 'Network error while communicating with OpenAI';
            suggestedAction = 'Check your internet connection and try again';
        } else if (isAPIError) {
            errorPrefix = 'OpenAI API error';
            suggestedAction = 'Check your API key validity and quota limits';
        } 
        // ... more sophisticated error handling
    }
}
```

### Extension Activation Integration

The extension activation showcases graceful degradation:

```typescript
export async function activate(context: vscode.ExtensionContext) {
    const initialized = await initializeOpenAIClient(context);
    if (!initialized) {
        // Enhanced state inspection instead of hard failure
        const clientState = getOpenAIClientState();
        if (clientState.status === 'error') {
            console.log('Extension activation: OpenAI client initialization failed:', clientState.error.message);
        }
        
        // Extension remains functional - users can still try commands
        // which will prompt for API key setup as needed
    }
    
    // ... register commands that work with or without initial setup
}
```

## Testing Infrastructure

Comprehensive test utilities enable thorough testing of all scenarios:

```typescript
// Complete mock implementations for all interfaces
export const createMockDependencies = (): OpenAIServiceDependencies => ({
    secretStorage: new MockSecretStorageProvider(),
    userInteraction: new MockUserInteractionProvider(),
    clientFactory: new MockOpenAIClientFactory()
});

// Test scenarios covering edge cases and error conditions
export const testScenarios = {
    missingAPIKey: () => createMockDependencies(),
    validAPIKey: () => {
        const deps = createMockDependencies();
        (deps.secretStorage as MockSecretStorageProvider).setStoredValue(API_KEY_STORAGE_KEY, 'sk-validkey123');
        return deps;
    },
    // ... comprehensive scenario coverage
};
```

## Benefits Achieved

### 1. **Maintainability**
- Clear separation of concerns across architectural layers
- Pure functions eliminate debugging complexity
- Rich types catch errors at compile time

### 2. **Testability**
- Dependency injection enables easy mocking
- Pure core logic requires no setup or teardown
- Comprehensive test scenarios cover edge cases

### 3. **Reliability**
- Discriminated unions make invalid states impossible
- Exhaustive pattern matching ensures all cases are handled
- Structured error types provide actionable feedback

### 4. **Extensibility**
- New adapters can be added without changing core logic
- Workflows can be composed from pure functions
- Interface-based design supports multiple implementations

### 5. **Developer Experience**
- Rich TypeScript support with excellent IntelliSense
- Clear documentation of business rules through types
- Backward compatibility ensures smooth migration

## Migration Path

The refactoring maintains complete backward compatibility:

1. **Existing code continues to work** - All public APIs preserved
2. **Gradual adoption** - New features can use enhanced patterns
3. **Learning opportunity** - Team can explore new patterns at their own pace
4. **Risk mitigation** - No breaking changes during transition

This architecture demonstrates how functional programming and domain-driven design principles can be applied to create elegant, maintainable code that grows with your project's needs while preserving the investment in existing functionality.
