/**
 * A `Model` is a provider plus a model id — the two facts the gateway needs to route
 * a request and the credential layer needs to pick the right key. Selection is driven
 * by a small curated `CATALOG` (latest flagship + mini per provider) rather than the
 * raw provider model list, which is how v1/v2 ended up offering models that don't work
 * for this task. A free-text "custom" id is still allowed via `makeModel`.
 */

import { type Brand, none, type OptionType, some } from '../fp';
import { type Provider } from './provider';

export type ModelId = Brand<string, 'ModelId'>;

export interface Model {
  readonly provider: Provider;
  readonly id: ModelId;
}

export const makeModel = (provider: Provider, id: string): Model => ({
  provider,
  id: id as ModelId,
});

export const modelText = (id: ModelId): string => id;

export const sameModel = (a: Model, b: Model): boolean =>
  a.provider === b.provider && a.id === b.id;

export const parseModelId = (raw: string): OptionType<ModelId> => {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? some(trimmed as ModelId) : none;
};

/** A curated, recommendable model with display copy for the picker. */
export interface SupportedModel {
  readonly model: Model;
  readonly displayName: string;
  readonly blurb: string;
}

// Verified against each provider's live model list (June 2026). Note: there is no
// `gpt-5.5-mini` — the 5.5 line is flagship + pro only — so the mini slot uses the
// current strongest mini, `gpt-5.4-mini`. Bump these strings as new models ship.
export const CATALOG: ReadonlyArray<SupportedModel> = [
  {
    model: makeModel('openai', 'gpt-5.5'),
    displayName: 'GPT-5.5',
    blurb: 'OpenAI · latest flagship (recommended)',
  },
  {
    model: makeModel('openai', 'gpt-5.4-mini'),
    displayName: 'GPT-5.4 mini',
    blurb: 'OpenAI · faster and cheaper',
  },
  {
    model: makeModel('anthropic', 'claude-sonnet-4-6'),
    displayName: 'Claude Sonnet 4.6',
    blurb: 'Anthropic · strong instruction-following',
  },
  {
    model: makeModel('anthropic', 'claude-haiku-4-5'),
    displayName: 'Claude Haiku 4.5',
    blurb: 'Anthropic · fastest and cheapest',
  },
];

export const DEFAULT_MODEL: Model = makeModel('openai', 'gpt-5.5');
