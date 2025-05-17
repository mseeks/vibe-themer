// Prompt service for loading and managing prompt templates
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for storing prompt templates
 */
export interface PromptTemplates {
    baseColorsPrompt: string;
    tokenColorsPrompt: string;
}

/**
 * Loads prompt templates from the file system
 * @param context The extension context to locate files
 * @returns Object containing the prompt templates
 */
export function loadPromptTemplates(context: vscode.ExtensionContext): PromptTemplates {
    try {
        // Use extensionUri.fsPath to locate prompts in src/prompts at runtime
        const promptsDir = path.join(context.extensionUri.fsPath, 'src', 'prompts');
        const baseColorsPrompt = fs.readFileSync(path.join(promptsDir, 'baseColorsPrompt.txt'), 'utf8');
        const tokenColorsPrompt = fs.readFileSync(path.join(promptsDir, 'tokenColorsPrompt.txt'), 'utf8');
        
        return {
            baseColorsPrompt,
            tokenColorsPrompt
        };
    } catch (error: any) {
        console.error('Error loading prompt templates:', error);
        throw new Error(`Failed to load prompt templates: ${error.message}`);
    }
}
