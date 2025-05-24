/**
 * Test utilities and examples for the refactored OpenAI service.
 * Demonstrates the functional approach and domain-driven design principles.
 */

import OpenAI from 'openai';
import { 
    OpenAIServiceDependencies, 
    SecretStorageProvider, 
    UserInteractionProvider,
    OpenAIClientFactory,
    OpenAIServiceResult,
    OpenAIServiceError,
    APIKeyState,
    OpenAIClientState
} from '../types/theme';
import { 
    initializeOpenAIClient, 
    ensureOpenAIClient, 
    resetOpenAIClient 
} from './openaiApplication';
import { createOpenAIServiceError } from './openaiCore';

/**
 * Mock secret storage provider for testing.
 * Demonstrates how dependency injection enables testing of pure business logic.
 */
class MockSecretStorageProvider implements SecretStorageProvider {
    private storage = new Map<string, string>();
    private operationLog: Array<{ operation: string; key: string; value?: string }> = [];

    async get(key: string): Promise<string | undefined> {
        this.operationLog.push({ operation: 'get', key });
        return this.storage.get(key);
    }

    async store(key: string, value: string): Promise<void> {
        this.operationLog.push({ operation: 'store', key, value });
        this.storage.set(key, value);
    }

    async delete(key: string): Promise<void> {
        this.operationLog.push({ operation: 'delete', key });
        this.storage.delete(key);
    }

    // Test utilities
    getOperationLog() {
        return [...this.operationLog];
    }

    getStoredValue(key: string) {
        return this.storage.get(key);
    }

    presetValue(key: string, value: string) {
        this.storage.set(key, value);
    }

    clearLog() {
        this.operationLog = [];
    }
}

/**
 * Test user interaction provider that captures interactions for verification.
 */
class TestUserInteractionProvider implements UserInteractionProvider {
    private interactions: Array<{ type: string; message?: string; response?: string }> = [];
    
    constructor(
        private mockApiKeyResponse?: string,
        private shouldLogMessages: boolean = true
    ) {}

    async promptForAPIKey(): Promise<string | undefined> {
        this.interactions.push({ type: 'promptForAPIKey', response: this.mockApiKeyResponse });
        return this.mockApiKeyResponse;
    }

    async showSuccessMessage(message: string): Promise<void> {
        this.interactions.push({ type: 'showSuccessMessage', message });
        if (this.shouldLogMessages) {
            console.log('Success:', message);
        }
    }

    async showErrorMessage(message: string): Promise<void> {
        this.interactions.push({ type: 'showErrorMessage', message });
        if (this.shouldLogMessages) {
            console.error('Error:', message);
        }
    }

    async showInformationMessage(message: string): Promise<void> {
        this.interactions.push({ type: 'showInformationMessage', message });
        if (this.shouldLogMessages) {
            console.log('Info:', message);
        }
    }

    // Test utilities
    getInteractions() {
        return [...this.interactions];
    }

    clearInteractions() {
        this.interactions = [];
    }

    setMockApiKeyResponse(response: string | undefined) {
        this.mockApiKeyResponse = response;
    }
}

/**
 * Mock OpenAI client factory for testing without actual API calls.
 */
class MockOpenAIClientFactory implements OpenAIClientFactory {
    private shouldValidationSucceed: boolean;
    private createdClients: OpenAI[] = [];

    constructor(shouldValidationSucceed: boolean = true) {
        this.shouldValidationSucceed = shouldValidationSucceed;
    }

    async createClient(apiKey: string): Promise<OpenAI> {
        // Create a mock client - in real tests you'd use a proper mock library
        const mockClient = {} as OpenAI;
        this.createdClients.push(mockClient);
        return mockClient;
    }

    async validateClient(client: OpenAI): Promise<boolean> {
        return this.shouldValidationSucceed;
    }

    // Test utilities
    getCreatedClients() {
        return [...this.createdClients];
    }

    setValidationResult(shouldSucceed: boolean) {
        this.shouldValidationSucceed = shouldSucceed;
    }
}

/**
 * Factory for creating test dependencies with mocked implementations.
 */
export const createTestOpenAIDependencies = (options: {
    presetApiKey?: string;
    mockUserApiKey?: string;
    shouldValidationSucceed?: boolean;
    shouldLogMessages?: boolean;
} = {}): { 
    deps: OpenAIServiceDependencies; 
    mocks: { 
        storage: MockSecretStorageProvider; 
        userInteraction: TestUserInteractionProvider;
        clientFactory: MockOpenAIClientFactory;
    } 
} => {
    const storage = new MockSecretStorageProvider();
    const userInteraction = new TestUserInteractionProvider(
        options.mockUserApiKey, 
        options.shouldLogMessages ?? false
    );
    const clientFactory = new MockOpenAIClientFactory(options.shouldValidationSucceed ?? true);

    // Preset storage if requested
    if (options.presetApiKey) {
        storage.presetValue('openaiApiKey', options.presetApiKey);
    }

    const deps: OpenAIServiceDependencies = {
        secretStorage: storage,
        userInteraction,
        clientFactory
    };

    return { deps, mocks: { storage, userInteraction, clientFactory } };
};

/**
 * Example usage demonstrating the elegant API and comprehensive error handling.
 */
export const demonstrateOpenAIServiceUsage = async (): Promise<void> => {
    console.log('=== OpenAI Service Architecture Demonstration ===\n');

    // Example 1: Successful initialization with stored API key
    console.log('1. Testing initialization with stored API key...');
    const { deps: deps1, mocks: mocks1 } = createTestOpenAIDependencies({
        presetApiKey: 'sk-test-key-1234567890abcdef',
        shouldValidationSucceed: true,
        shouldLogMessages: true
    });

    const result1 = await initializeOpenAIClient(deps1);
    if (result1.success) {
        console.log(`✅ Client initialized successfully`);
        console.log(`   State: ${result1.clientState.status}`);
        console.log(`   Storage operations: ${mocks1.storage.getOperationLog().length}`);
    } else {
        console.log(`❌ Initialization failed: ${result1.error.message}`);
    }

    // Example 2: User provides API key when none is stored
    console.log('\n2. Testing user API key input...');
    const { deps: deps2, mocks: mocks2 } = createTestOpenAIDependencies({
        mockUserApiKey: 'sk-user-provided-key',
        shouldValidationSucceed: true,
        shouldLogMessages: true
    });

    const result2 = await initializeOpenAIClient(deps2);
    if (result2.success) {
        console.log(`✅ Client initialized with user-provided key`);
        const interactions = mocks2.userInteraction.getInteractions();
        const promptCount = interactions.filter(i => i.type === 'promptForAPIKey').length;
        console.log(`   User prompts: ${promptCount}`);
        console.log(`   Final storage state: ${mocks2.storage.getStoredValue('openaiApiKey') ? 'key stored' : 'no key'}`);
    }

    // Example 3: Invalid API key handling
    console.log('\n3. Testing invalid API key handling...');
    const { deps: deps3, mocks: mocks3 } = createTestOpenAIDependencies({
        presetApiKey: 'invalid-key-format',
        shouldValidationSucceed: false,
        shouldLogMessages: true
    });

    const result3 = await initializeOpenAIClient(deps3);
    if (!result3.success) {
        console.log(`✅ Invalid key properly rejected`);
        console.log(`   Error type: ${result3.error.errorType}`);
        console.log(`   Recoverable: ${result3.error.recoverable}`);
        console.log(`   Suggested action: ${result3.error.suggestedAction}`);
    }

    // Example 4: Ensure client with existing initialization
    console.log('\n4. Testing ensure client functionality...');
    const { deps: deps4 } = createTestOpenAIDependencies({
        presetApiKey: 'sk-existing-key',
        shouldValidationSucceed: true,
        shouldLogMessages: true
    });

    const ensureResult = await ensureOpenAIClient(deps4);
    if (ensureResult.success) {
        console.log(`✅ Client ensured successfully`);
        
        // Subsequent calls should reuse the client
        const ensureResult2 = await ensureOpenAIClient(deps4);
        console.log(`   Second ensure call also successful: ${ensureResult2.success}`);
    }

    // Example 5: Reset functionality
    console.log('\n5. Testing client reset...');
    const { deps: deps5, mocks: mocks5 } = createTestOpenAIDependencies({
        presetApiKey: 'sk-reset-test-key',
        shouldLogMessages: true
    });

    await initializeOpenAIClient(deps5); // Initialize first
    const resetResult = await resetOpenAIClient(deps5);
    
    if (resetResult.success) {
        console.log(`✅ Client reset successfully`);
        console.log(`   Storage cleared: ${!mocks5.storage.getStoredValue('openaiApiKey')}`);
        console.log(`   Client state: ${resetResult.clientState.status}`);
    }

    console.log('\n=== Demonstration Complete ===');
};

/**
 * Advanced example showing custom error handling strategies.
 */
export const demonstrateErrorHandling = async (): Promise<void> => {
    console.log('=== Error Handling Demonstration ===\n');

    // Scenario 1: User cancels API key prompt
    const { deps: cancelDeps } = createTestOpenAIDependencies({
        mockUserApiKey: undefined, // Simulate user cancellation
        shouldLogMessages: true
    });

    const cancelResult = await initializeOpenAIClient(cancelDeps);
    if (!cancelResult.success) {
        console.log('User cancellation handled gracefully:');
        console.log(`  Message: ${cancelResult.error.message}`);
        console.log(`  Error type: ${cancelResult.error.errorType}`);
        console.log(`  Suggested action: ${cancelResult.error.suggestedAction}`);
    }

    // Scenario 2: Network/validation failure
    const { deps: networkDeps } = createTestOpenAIDependencies({
        presetApiKey: 'sk-network-will-fail',
        shouldValidationSucceed: false,
        shouldLogMessages: true
    });

    const networkResult = await initializeOpenAIClient(networkDeps);
    if (!networkResult.success) {
        console.log('\nNetwork failure handled gracefully:');
        console.log(`  Message: ${networkResult.error.message}`);
        console.log(`  Recoverable: ${networkResult.error.recoverable}`);
    }

    console.log('\n=== Error Handling Demo Complete ===');
};
