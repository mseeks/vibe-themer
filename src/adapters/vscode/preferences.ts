import type * as vscode from 'vscode';
import { none, type OptionType } from '../../fp';
import { type Model, modelText, parseModel } from '../../domain/model';
import { allProviders, type Provider } from '../../domain/provider';
import { type Preferences } from '../../ports';

const MODEL_KEY = 'selectedModel';

interface StoredModel {
  readonly provider: string;
  readonly id: string;
}

const isProvider = (value: string): value is Provider =>
  (allProviders as ReadonlyArray<string>).includes(value);

const toModel = (stored: StoredModel | undefined): OptionType<Model> => {
  if (stored === undefined || typeof stored.id !== 'string' || !isProvider(stored.provider)) {
    return none;
  }
  return parseModel(stored.provider, stored.id);
};

export const createPreferences = (state: vscode.Memento): Preferences => ({
  selectedModel: (): OptionType<Model> => toModel(state.get<StoredModel>(MODEL_KEY)),
  selectModel: async (model: Model) => {
    await state.update(MODEL_KEY, { provider: model.provider, id: modelText(model.id) });
  },
  clearModel: async () => {
    await state.update(MODEL_KEY, undefined);
  },
});
