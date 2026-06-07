import Anthropic from '@anthropic-ai/sdk';
import { AsyncResult, type AsyncResultType, expose, ok, type Redacted } from '../../fp';
import { type ApiKey } from '../../domain/apiKey';
import { modelText } from '../../domain/model';
import { type ProviderAdapter, type ProviderError, type ProviderRequest } from '../../ports';
import { classifyByStatus } from '../classify';

// A comprehensive theme covers the full selector + token-scope catalog (hundreds of
// one-line SELECTOR/TOKEN directives, plus interspersed MESSAGE lines), so the cap is
// sized for that worst case with headroom — not the ~120 a typical theme emits. (The
// OpenAI adapter sets no cap; Chat Completions defaults to the model maximum.)
const MAX_TOKENS = 32000;

const classify = (e: unknown): ProviderError =>
  e instanceof Anthropic.APIError ? classifyByStatus(e.status, e.message) : { _tag: 'Network' };

const clientFor = (key: Redacted<ApiKey>): Anthropic => new Anthropic({ apiKey: expose(key) });

export async function* toContentStream(
  stream: AsyncIterable<Anthropic.Messages.RawMessageStreamEvent>,
): AsyncIterable<string> {
  // A failure *after* the stream opens (429 once tokens flow, dropped socket, idle
  // timeout) surfaces by throwing here. Classify it so the consumer sees a typed
  // ProviderError instead of a raw SDK error / unhandled rejection.
  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  } catch (e) {
    throw classify(e);
  }
}

export const createAnthropicAdapter = (): ProviderAdapter => ({
  verify: (key) =>
    AsyncResult.tryCatch(async () => {
      await clientFor(key).models.list();
    }, classify),

  streamTheme: async (
    request: ProviderRequest,
  ): AsyncResultType<ProviderError, AsyncIterable<string>> => {
    const opened = await AsyncResult.tryCatch(
      () =>
        clientFor(request.key).messages.create({
          model: modelText(request.model),
          max_tokens: MAX_TOKENS,
          // The 1,000-line prompt is static — cache it so repeat generations are
          // cheaper and lower-latency within the cache TTL.
          system: [{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: request.user }],
          stream: true,
        }),
      classify,
    );
    return opened._tag === 'Err' ? opened : ok(toContentStream(opened.value));
  },
});
