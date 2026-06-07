import type * as vscode from 'vscode';
import { none, type OptionType } from '../../fp';
import { type ModelId, modelText, parseModelId } from '../../domain/model';
import { type Preferences } from '../../ports';

const MODEL_KEY = 'openaiModel';

export const createPreferences = (state: vscode.Memento): Preferences => ({
  selectedModel: (): OptionType<ModelId> => {
    const raw = state.get<string>(MODEL_KEY);
    return raw === undefined ? none : parseModelId(raw);
  },
  selectModel: async (model) => {
    await state.update(MODEL_KEY, modelText(model));
  },
  clearModel: async () => {
    await state.update(MODEL_KEY, undefined);
  },
});
