import * as vscode from 'vscode';
import { ensureOpenAIClient } from '../services/openaiService';

const MODEL_KEY = 'openaiModel';

export async function selectOpenAIModel(context: vscode.ExtensionContext) {
    const openai = await ensureOpenAIClient(context);
    if (!openai) return;
    let models: string[] = [];
    try {
        const response = await openai.models.list();
        models = response.data
            .map((m: any) => m.id)
            .filter((id: string) => id.startsWith('gpt-'));
    } catch (err: any) {
        vscode.window.showErrorMessage('Failed to fetch OpenAI models: ' + err.message);
        return;
    }
    if (!models.length) {
        vscode.window.showWarningMessage('No OpenAI models available for your API key.');
        return;
    }
    const current = context.globalState.get<string>(MODEL_KEY);
    const pick = await vscode.window.showQuickPick(models, {
        title: 'Select OpenAI Model',
        placeHolder: current || 'Choose a model',
        canPickMany: false,
        ignoreFocusOut: true
    });
    if (pick) {
        await context.globalState.update(MODEL_KEY, pick);
        vscode.window.showInformationMessage(`OpenAI model set to: ${pick}`);
    }
}

export async function resetOpenAIModel(context: vscode.ExtensionContext) {
    await context.globalState.update(MODEL_KEY, undefined);
    vscode.window.showInformationMessage('OpenAI model selection has been reset.');
}

export function getSelectedOpenAIModel(context: vscode.ExtensionContext): string | undefined {
    return context.globalState.get<string>(MODEL_KEY);
}
