// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { normalizeHexColor, getContrastColor, adjustColor, isDarkTheme } from './utils/colorUtils';
import { initializeOpenAIClient, getOpenAIClient, generateTokenColors, ensureOpenAIClient } from './services/openaiService';
import { registerClearApiKeyCommand } from './commands/clearApiKeyCommand';
import { registerResetThemeCommand } from './commands/resetThemeCommand';
import { registerExportThemeCommand } from './commands/exportThemeCommand';
import { applyThemeCustomizations } from './services/themeService';
import { runThemeGenerationWorkflow } from './services/themeGenerationService';

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

export async function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "dynamic-theme-changer" is now active!');

    // Initialize OpenAI client
    const initialized = await initializeOpenAIClient(context);
    if (!initialized) {
        return; // Deactivate if no key is provided
    }
    
    // Get the initialized OpenAI client
    openai = getOpenAIClient();

    // Register command to change theme based on natural language description
    let changeThemeCommand = vscode.commands.registerCommand('dynamicThemeChanger.changeTheme', async () => {
        await runThemeGenerationWorkflow(context, { current: lastGeneratedTheme });
    });

    context.subscriptions.push(changeThemeCommand);

    // Register command to clear API key (refactored)
    registerClearApiKeyCommand(context, { current: openai });
    
    // Register command to reset theme customizations (refactored)
    registerResetThemeCommand(context, { current: lastGeneratedTheme });
    
    // Register command to export the current theme (refactored)
    registerExportThemeCommand(context, { current: lastGeneratedTheme });
}

