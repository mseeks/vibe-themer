/**
 * `ModelId` — an OpenAI model identifier. The default is `gpt-4.1`, a current and
 * valid Chat Completions model (preserved from v1; the review's "gpt-4.1 is invalid"
 * claim was a false positive). Selection filters to GPT-family ids to match v1's UX.
 */

import { type Brand, none, type OptionType, some } from '../fp';

export type ModelId = Brand<string, 'ModelId'>;

export const DEFAULT_MODEL = 'gpt-4.1' as ModelId;

export const parseModelId = (raw: string): OptionType<ModelId> => {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? some(trimmed as ModelId) : none;
};

export const isGptModel = (id: ModelId): boolean => id.toLowerCase().startsWith('gpt');

export const modelText = (id: ModelId): string => id;
