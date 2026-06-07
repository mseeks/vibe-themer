/**
 * The smaller commands: reset theme, clear key, select/reset model. Each is a short
 * port choreography returning `void` (their feedback is a notification, not a value).
 */

import { type Capabilities, renderConfigError, renderOpenAiError, renderStorageError, userMessage } from '../ports';
import { modelText } from '../domain/model';
import { provisionApiKey, renderProvisionError } from './provisionApiKey';

export const resetTheme = async (caps: Capabilities): Promise<void> => {
  const result = await caps.config.reset();
  if (result._tag === 'Ok') {
    await caps.ui.announceReset();
  } else {
    await caps.ui.notify(renderConfigError(result.error), 'error');
  }
};

export const clearApiKey = async (caps: Capabilities): Promise<void> => {
  const result = await caps.secrets.clear();
  if (result._tag === 'Ok') {
    await caps.ui.notify(userMessage('🔑 OpenAI API key cleared'), 'info');
  } else {
    await caps.ui.notify(renderStorageError(result.error), 'error');
  }
};

export const resetModel = async (caps: Capabilities): Promise<void> => {
  await caps.preferences.clearModel();
  await caps.ui.notify(
    userMessage('🔄 Model selection reset', { detail: 'The default model will be used.' }),
    'info',
  );
};

export const selectModel = async (caps: Capabilities): Promise<void> => {
  const keyResult = await provisionApiKey(caps);
  if (keyResult._tag === 'Err') {
    const message = renderProvisionError(keyResult.error);
    if (message._tag === 'Some') {
      await caps.ui.notify(message.value, 'error');
    }
    return;
  }

  const modelsResult = await caps.openai.listGptModels(keyResult.value);
  if (modelsResult._tag === 'Err') {
    await caps.ui.notify(renderOpenAiError(modelsResult.error), 'error');
    return;
  }

  const picked = await caps.ui.pickModel(modelsResult.value, caps.preferences.selectedModel());
  if (picked._tag === 'Err' || picked.value._tag === 'None') {
    return;
  }

  const model = picked.value.value;
  await caps.preferences.selectModel(model);
  await caps.ui.notify(
    userMessage(`🎯 Model set to ${modelText(model)}`, {
      detail: 'This model will be used for future theme generations.',
    }),
    'info',
  );
};
