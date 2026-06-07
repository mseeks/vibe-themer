import OpenAI from 'openai';
import { AsyncResult, type AsyncResultType, expose, ok, type Redacted } from '../../fp';
import { type ApiKey } from '../../domain/apiKey';
import { modelText } from '../../domain/model';
import { type ProviderAdapter, type ProviderError, type ProviderRequest } from '../../ports';

/** Classify an SDK error by status code, instead of v1's substring sniffing. */
const classify = (e: unknown): ProviderError => {
  if (e instanceof OpenAI.APIError) {
    if (e.status === 401 || e.status === 403) {
      return { _tag: 'AuthFailed' };
    }
    if (e.status === 429) {
      return { _tag: 'RateLimited' };
    }
    if (e.status === undefined) {
      return { _tag: 'Network' };
    }
    return { _tag: 'Unexpected', detail: e.message };
  }
  return { _tag: 'Network' };
};

const clientFor = (key: Redacted<ApiKey>): OpenAI => new OpenAI({ apiKey: expose(key) });

// GPT-5 / o-series are reasoning models; `minimal` effort keeps them fast and
// streaming token-by-token (the "watch it paint" UX) rather than pausing to think.
// Non-reasoning custom models (e.g. gpt-4o) reject the parameter, so only send it
// where it's supported.
const REASONING_FAMILY = /^(gpt-5|o[0-9])/i;
const isReasoningModel = (id: string): boolean => REASONING_FAMILY.test(id);

async function* toContentStream(
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
          ...(isReasoningModel(id) ? { reasoning_effort: 'minimal' as const } : {}),
        }),
      classify,
    );
    return opened._tag === 'Err' ? opened : ok(toContentStream(opened.value));
  },
});
