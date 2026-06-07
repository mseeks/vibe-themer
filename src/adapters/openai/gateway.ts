import OpenAI from 'openai';
import { AsyncResult, type AsyncResultType, err, expose, isNonEmptyArray, type NonEmptyArray, ok, type Redacted } from '../../fp';
import { type ApiKey } from '../../domain/apiKey';
import { isGptModel, type ModelId, modelText, parseModelId } from '../../domain/model';
import { type GenerationRequest, type OpenAiError, type OpenAiGateway } from '../../ports';

/** Classify an SDK error by status code, instead of v1's substring sniffing. */
const classify = (e: unknown): OpenAiError => {
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

async function* toContentStream(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
): AsyncIterable<string> {
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

export const createOpenAiGateway = (): OpenAiGateway => ({
  verify: (key) =>
    AsyncResult.tryCatch(async () => {
      await clientFor(key).models.list();
    }, classify),

  listGptModels: async (
    key,
  ): AsyncResultType<OpenAiError, NonEmptyArray<ModelId>> => {
    const listed = await AsyncResult.tryCatch(
      async () => (await clientFor(key).models.list()).data,
      classify,
    );
    if (listed._tag === 'Err') {
      return listed;
    }

    const models: ModelId[] = [];
    for (const model of listed.value) {
      const parsed = parseModelId(model.id);
      if (parsed._tag === 'Some' && isGptModel(parsed.value)) {
        models.push(parsed.value);
      }
    }
    return isNonEmptyArray(models) ? ok(models) : err({ _tag: 'NoModelsAvailable' });
  },

  streamTheme: async (
    request: GenerationRequest,
  ): AsyncResultType<OpenAiError, AsyncIterable<string>> => {
    const opened = await AsyncResult.tryCatch(
      () =>
        clientFor(request.key).chat.completions.create({
          model: modelText(request.model),
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
          stream: true,
        }),
      classify,
    );
    return opened._tag === 'Err' ? opened : ok(toContentStream(opened.value));
  },
});
