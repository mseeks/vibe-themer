import OpenAI from 'openai';
import { AsyncResult, type AsyncResultType, expose, ok, type Redacted } from '../../fp';
import { type ApiKey } from '../../domain/apiKey';
import { modelText } from '../../domain/model';
import { type ProviderAdapter, type ProviderError, type ProviderRequest } from '../../ports';
import { classifyByStatus } from '../classify';

/** Classify an SDK error by status code, instead of v1's substring sniffing. */
const classify = (e: unknown): ProviderError =>
  e instanceof OpenAI.APIError ? classifyByStatus(e.status, e.message) : { _tag: 'Network' };

const clientFor = (key: Redacted<ApiKey>): OpenAI => new OpenAI({ apiKey: expose(key) });

// GPT-5 / o-series reason by default, which stalls the "watch it paint" UX, so we ask
// for *no* reasoning. The no-reasoning value changed at gpt-5.1: newer models (e.g.
// gpt-5.5, gpt-5.4-mini) use 'none' and reject 'minimal'; gpt-5(.0) and o-series use
// 'minimal' and reject 'none'. Send whichever the model accepts. Non-reasoning models
// (e.g. gpt-4o) reject the parameter entirely, so it's only sent when the family matches.
const REASONING_FAMILY = /^(gpt-5|o[0-9])/i;
const NONE_SCALE = /^gpt-5\.[1-9]/i; // gpt-5.1+ replaced 'minimal' with 'none'
export const isReasoningModel = (id: string): boolean => REASONING_FAMILY.test(id);

/** The no-reasoning effort the model accepts ('none' for gpt-5.1+, else 'minimal'); empty for non-reasoning. */
export const reasoningParams = (id: string): { readonly reasoning_effort?: 'none' | 'minimal' } => {
  if (!isReasoningModel(id)) {
    return {};
  }
  return { reasoning_effort: NONE_SCALE.test(id) ? 'none' : 'minimal' };
};

export async function* toContentStream(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
): AsyncIterable<string> {
  // A failure *after* the stream opens (429 once tokens flow, dropped socket, idle
  // timeout) surfaces by throwing here. Classify it so the consumer sees a typed
  // ProviderError instead of a raw SDK error / unhandled rejection.
  try {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (e) {
    throw classify(e);
  }
}

export const createOpenAiAdapter = (): ProviderAdapter => ({
  verify: (key) =>
    AsyncResult.tryCatch(async () => {
      await clientFor(key).models.list();
    }, classify),

  streamTheme: async (
    request: ProviderRequest,
  ): AsyncResultType<ProviderError, AsyncIterable<string>> => {
    const id = modelText(request.model);
    const opened = await AsyncResult.tryCatch(
      () =>
        clientFor(request.key).chat.completions.create({
          model: id,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
          stream: true,
          ...reasoningParams(id),
        }),
      classify,
    );
    return opened._tag === 'Err' ? opened : ok(toContentStream(opened.value));
  },
});
