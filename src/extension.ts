// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import OpenAI from 'openai';
import { 
    initializeOpenAIClient, 
    getOpenAIClient, 
    getOpenAIClientState,
    resetOpenAIClient 
} from './services/openaiService';
import { registerClearApiKeyCommand } from './commands/clearApiKeyCommand';
import { registerResetThemeCommand } from './commands/resetThemeCommand';
import { runThemeGenerationWorkflow } from './services/themeGenerationService';
import { selectOpenAIModel, resetOpenAIModel } from './commands/modelSelectCommand';
import { testCurrentThemeReading } from './utils/themeStateTest';
import { testCountParsing } from './utils/countParsingTest';
import { testContextInjection } from './utils/contextInjectionTest';
import { testRemoveValues } from './utils/removeValueTest';

// Reference to the OpenAI client instance
let openai: OpenAI | undefined;

// Interface for theme data
interface ThemeData {
    name: string;
    description: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        foreground: string;
    };
    tokenColors?: any;
}

// Store the last generated theme
let lastGeneratedTheme: ThemeData | undefined;

export function activate(context: vscode.ExtensionContext) {
    // Set development mode context for command visibility
    const isDevelopment = context.extensionMode === vscode.ExtensionMode.Development;
    vscode.commands.executeCommand('setContext', 'vibeThemer.development', isDevelopment);
    
    // Register commands FIRST to ensure they're available immediately
    // Command registration should be synchronous and happen before any async operations
    
    // Register command to change theme based on natural language description
    let changeThemeCommand = vscode.commands.registerCommand('vibeThemer.changeTheme', async () => {
        await runThemeGenerationWorkflow(context, { current: lastGeneratedTheme });
        // Update our local reference after theme generation
        openai = getOpenAIClient();
    });
    context.subscriptions.push(changeThemeCommand);

    // Register command to clear API key (using enhanced reset functionality)
    registerClearApiKeyCommand(context, { current: openai });
    
    // Register command to reset theme customizations (using enhanced architecture)
    registerResetThemeCommand(context, { current: lastGeneratedTheme });

    // Register command to select OpenAI model
    let selectModelCommand = vscode.commands.registerCommand('vibeThemer.selectModel', async () => {
        await selectOpenAIModel(context);
    });
    context.subscriptions.push(selectModelCommand);

    // Register command to reset OpenAI model selection
    let resetModelCommand = vscode.commands.registerCommand('vibeThemer.resetModel', async () => {
        await resetOpenAIModel(context);
    });
    context.subscriptions.push(resetModelCommand);

    // Register test command for current theme state reading (development only)
    if (context.extensionMode === vscode.ExtensionMode.Development) {
        let testThemeStateCommand = vscode.commands.registerCommand('vibeThemer.testThemeState', async () => {
            await testCurrentThemeReading();
        });
        context.subscriptions.push(testThemeStateCommand);

        let testCountParsingCommand = vscode.commands.registerCommand('vibeThemer.testCountParsing', async () => {
            await testCountParsing();
        });
        context.subscriptions.push(testCountParsingCommand);

        let testContextInjectionCommand = vscode.commands.registerCommand('vibeThemer.testContextInjection', async () => {
            await testContextInjection();
        });
        context.subscriptions.push(testContextInjectionCommand);

        let testRemoveValuesCommand = vscode.commands.registerCommand('vibeThemer.testRemoveValues', async () => {
            await testRemoveValues();
        });
        context.subscriptions.push(testRemoveValuesCommand);
    }

    // Initialize OpenAI client AFTER command registration
    // This async operation happens after commands are registered
    initializeOpenAIClient(context).then(initialized => {
        if (!initialized) {
            // The initialization process already handled user interaction
            // We can inspect the state to understand what happened
            const clientState = getOpenAIClientState();
            if (clientState.status === 'error') {
                console.log('Extension activation: OpenAI client initialization failed:', clientState.error.message);
            } else {
                console.log('Extension activation: OpenAI client initialization was cancelled or failed');
            }
            
            // We don't return here anymore - the extension should still be functional
            // Users can still try to use commands which will prompt for API key setup
        }
        
        // Get the initialized OpenAI client (may be undefined if not set up)
        openai = getOpenAIClient();
    }).catch(error => {
        console.error('Extension activation: OpenAI client initialization error:', error);
        // Extension should still be functional even if OpenAI setup fails
    });
}

// This method is called when your extension is deactivated
export function deactivate() {
    // Clean up resources if needed
}

