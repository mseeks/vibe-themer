/**
 * The smaller commands: reset theme, clear keys, select/reset model. Each is a short
 * port choreography returning `void` (their feedback is a notification, not a value).
 */

import { type Capabilities, renderConfigError, renderStorageError, userMessage } from '../ports';
import { CATALOG, modelText } from '../domain/model';
import { providerInfo } from '../domain/provider';

export const resetTheme = async (caps: Capabilities): Promise<void> => {
  const result = await caps.config.reset();
  if (result._tag === 'Ok') {
    await caps.ui.announceReset();
  } else {
    await caps.ui.notify(renderConfigError(result.error), 'error');
  }
};

export const clearApiKey = async (caps: Capabilities): Promise<void> => {
  const result = await caps.secrets.clearAll();
  if (result._tag === 'Ok') {
    await caps.ui.notify(userMessage('🔑 API keys cleared (all providers)'), 'info');
  } else {
    await caps.ui.notify(renderStorageError(result.error), 'error');
  }
};

export const resetModel = async (caps: Capabilities): Promise<void> => {
  await caps.preferences.clearModel();
  await caps.ui.notify(
    userMessage('🔄 Model selection reset', { detail: 'The default model (GPT-5.5) will be used.' }),
    'info',
  );
};

export const selectModel = async (caps: Capabilities): Promise<void> => {
  const picked = await caps.ui.pickModel(CATALOG, caps.preferences.selectedModel());
  if (picked._tag === 'Err' || picked.value._tag === 'None') {
    return;
  }

  const model = picked.value.value;
  await caps.preferences.selectModel(model);
  await caps.ui.notify(
    userMessage(`🎯 Model set to ${providerInfo(model.provider).displayName} · ${modelText(model.id)}`, {
      detail: 'Used for future theme generations. The provider key is requested on first use.',
    }),
    'info',
  );
};
