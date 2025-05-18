// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { normalizeHexColor, getContrastColor, adjustColor, isDarkTheme } from './utils/colorUtils';
import { initializeOpenAIClient, getOpenAIClient, generateTokenColors } from './services/openaiService';
import { loadPromptTemplates, PromptTemplates } from './services/promptService';
import { registerClearApiKeyCommand } from './commands/clearApiKeyCommand';
import { registerResetThemeCommand } from './commands/resetThemeCommand';
import { registerExportThemeCommand } from './commands/exportThemeCommand';
import { parseAndNormalizeColorPalette, NormalizedColorPalette } from './utils/colorPaletteParser';
import { applyThemeCustomizations } from './services/themeService';

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

    // Load prompt templates
    let promptTemplates: PromptTemplates;
    try {
        promptTemplates = loadPromptTemplates(context);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Error loading prompt templates: ${error.message}`);
        return; // Deactivate if templates can't be loaded
    }

    // Initialize OpenAI client
    const initialized = await initializeOpenAIClient(context);
    if (!initialized) {
        return; // Deactivate if no key is provided
    }
    
    // Get the initialized OpenAI client
    openai = getOpenAIClient();

    // Register command to change theme based on natural language description
    let changeThemeCommand = vscode.commands.registerCommand('dynamicThemeChanger.changeTheme', async () => {
        // Make sure we have the OpenAI client
        if (!openai) {
            vscode.window.showErrorMessage('OpenAI client not initialized. Please ensure API key is set.');
            // Attempt to re-initialize or prompt for key again
            const initialized = await initializeOpenAIClient(context);
            if (!initialized) {
                return; // Exit if initialization failed
            }
            // Get the initialized OpenAI client
            openai = getOpenAIClient();
        }

        const themeDescription = await vscode.window.showInputBox({
            prompt: 'Describe the theme you want (e.g., "warm and cozy", "futuristic dark blue")',
            placeHolder: 'e.g., "ocean vibes"'
        });

        if (!themeDescription) {
            vscode.window.showInformationMessage('No theme description provided.');
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Generating theme colors...",
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ message: "Generating base colors..." });
                    
                    // First create base colors
                    const completion = await openai!.chat.completions.create({
                        model: "gpt-4.1-mini",
                        messages: [
                            { role: "system", content: promptTemplates.baseColorsPrompt },
                            { role: "user", content: themeDescription }
                        ],
                        max_completion_tokens: 2000
                    });

                    const colorResponse = completion.choices[0]?.message?.content?.trim();
                    console.log('Raw color response from OpenAI:', colorResponse);

                    // Define default colors
                    const defaultColors: NormalizedColorPalette = {
                        primary: '#007acc',    // VS Code blue
                        secondary: '#444444',  // Dark gray
                        accent: '#ff8c00',     // Orange accent
                        background: '#1e1e1e', // Dark theme background
                        foreground: '#d4d4d4'  // Dark theme text
                    };

                    // Use the color palette parser utility
                    const { palette, replaced } = parseAndNormalizeColorPalette(colorResponse || '{}', defaultColors);
                    const { primary, secondary, accent, background, foreground } = palette;

                    console.log('OpenAI color palette (raw):', colorResponse);
                    console.log('Normalized palette:', palette);
                    console.log('Background color used for editor:', background);

                    if (replaced.length > 0) {
                        console.warn(`Some colors remained invalid after normalization: ${replaced.join(', ')}`);
                        vscode.window.showWarningMessage('Some colors were invalid and have been replaced with fallbacks.');
                    }

                    // Store the theme data
                    lastGeneratedTheme = {
                        name: `Custom Theme - ${themeDescription}`,
                        description: `Theme generated from: "${themeDescription}"`,
                        colors: { primary, secondary, accent, background, foreground }
                    };

                    progress.report({ message: "Generating syntax highlighting colors..." });
                    
                    // Now generate token colors for syntax highlighting using the new service
                    const tokenColors = await generateTokenColors(
                        openai,
                        promptTemplates,
                        { primary, secondary, accent, background, foreground },
                        themeDescription
                    );
                    if (lastGeneratedTheme) {
                        lastGeneratedTheme.tokenColors = tokenColors;
                    }

                    // Apply the colors to VS Code theme using the new service
                    await applyThemeCustomizations(
                        { primary, secondary, accent, background, foreground },
                        tokenColors,
                        themeDescription
                    );
                } catch (error: any) {
                    console.error('Color parsing error:', error);
                    vscode.window.showErrorMessage(`Could not generate a valid color theme. Error: ${error.message}`);
                }
            });
        } catch (error: any) {
            console.error('Extension error:', error);
            vscode.window.showErrorMessage(`Error communicating with OpenAI: ${error.message}`);
        }
    });

    context.subscriptions.push(changeThemeCommand);

    // Register command to clear API key (refactored)
    registerClearApiKeyCommand(context, { current: openai });
    
    // Register command to reset theme customizations (refactored)
    registerResetThemeCommand(context, { current: lastGeneratedTheme });
    
    // Register command to export the current theme (refactored)
    registerExportThemeCommand(context, { current: lastGeneratedTheme });
}

