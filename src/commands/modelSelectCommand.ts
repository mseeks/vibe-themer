import * as vscode from 'vscode';
import { ensureOpenAIClient } from '../services/openaiService';

const MODEL_KEY = 'openaiModel';

export async function selectOpenAIModel(context: vscode.ExtensionContext) {
    const openai = await ensureOpenAIClient(context);
    if (!openai) {return;}
    let models: string[] = [];
    try {
        const response = await openai.models.list();
        models = response.data
            .map((m: any) => m.id)
            .filter((modelId: string) => modelId.toLowerCase().startsWith('gpt'));
    } catch (err: any) {
        vscode.window.showErrorMessage('🔑 Failed to fetch OpenAI models: ' + err.message + '\n\nPlease check your API key and internet connection.', { modal: true });
        return;
    }
    if (!models.length) {
        vscode.window.showWarningMessage('⚠️ No OpenAI models available for your API key. Please verify your API key has the necessary permissions.', { modal: true });
        return;
    }
    const current = context.globalState.get<string>(MODEL_KEY);
    const pick = await vscode.window.showQuickPick(models, {
        title: '🤖 Select OpenAI Model for Theme Generation',
        placeHolder: current ? `Currently using: ${current}` : 'Choose which AI model to use (GPT-4 recommended for best themes)',
        canPickMany: false,
        ignoreFocusOut: true
    });
    if (pick) {
        await context.globalState.update(MODEL_KEY, pick);
        vscode.window.showInformationMessage(`🎯 OpenAI model updated to: ${pick}\n\nThis model will be used for all future theme generations.`, { modal: true });
    }
}

export async function resetOpenAIModel(context: vscode.ExtensionContext) {
    await context.globalState.update(MODEL_KEY, undefined);
    vscode.window.showInformationMessage('🔄 OpenAI model selection has been reset to default.\n\nThe extension will now use the default model for theme generation.', { modal: true });
}

export function getSelectedOpenAIModel(context: vscode.ExtensionContext): string | undefined {
    return context.globalState.get<string>(MODEL_KEY);
}
