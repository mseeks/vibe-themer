/**
 * Unit tests for the provider adapters' pure edge logic — the code the gateway
 * fake in harness.ts deliberately bypasses, so nothing else exercises it. A
 * reasoning_effort gate typo, a dropped status mapping, or a broken SDK-event
 * extraction would otherwise pass the whole suite.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ok, redact, type NonEmptyString, type Redacted } from '../src/fp';
import { type ApiKey } from '../src/domain/apiKey';
import { makeModel, modelText, type ModelId } from '../src/domain/model';
import { classifyByStatus } from '../src/adapters/classify';
import { createModelGateway } from '../src/adapters/gateway';
import {
  isReasoningModel,
  reasoningParams,
  toContentStream as openAiStream,
} from '../src/adapters/openai/gateway';
import { toContentStream as anthropicStream } from '../src/adapters/anthropic/gateway';
import { type ProviderAdapter, type ProviderRequest } from '../src/ports';

const cast = <T>(value: unknown): T => value as T;

describe('classifyByStatus', () => {
  it('maps HTTP status to a ProviderError', () => {
    assert.deepEqual(classifyByStatus(401, 'm'), { _tag: 'AuthFailed' });
    assert.deepEqual(classifyByStatus(403, 'm'), { _tag: 'AuthFailed' });
    assert.deepEqual(classifyByStatus(429, 'm'), { _tag: 'RateLimited' });
    assert.deepEqual(classifyByStatus(undefined, 'm'), { _tag: 'Network' });
    assert.deepEqual(classifyByStatus(500, 'boom'), { _tag: 'Unexpected', detail: 'boom' });
  });
});

describe('isReasoningModel (OpenAI reasoning_effort gate)', () => {
  it('matches gpt-5 and o-series, not gpt-4.x / non-OpenAI', () => {
    for (const id of ['gpt-5.5', 'gpt-5.4-mini', 'o3', 'o4-mini', 'GPT-5.5']) {
      assert.equal(isReasoningModel(id), true, id);
    }
    for (const id of ['gpt-4o', 'gpt-4.1', 'claude-sonnet-4-6']) {
      assert.equal(isReasoningModel(id), false, id);
    }
  });
});

describe('reasoningParams', () => {
  it("sends 'none' for gpt-5.1+, 'minimal' for older gpt-5/o-series, nothing otherwise", () => {
    // The scale flipped at gpt-5.1: 'none' 400s on older models, 'minimal' 400s on
    // gpt-5.1+. Each must get the no-reasoning value it actually accepts.
    for (const id of ['gpt-5.5', 'gpt-5.4-mini', 'GPT-5.2']) {
      assert.deepEqual(reasoningParams(id), { reasoning_effort: 'none' }, id);
    }
    for (const id of ['gpt-5', 'gpt-5-mini', 'o3', 'o4-mini']) {
      assert.deepEqual(reasoningParams(id), { reasoning_effort: 'minimal' }, id);
    }
    for (const id of ['gpt-4o', 'gpt-4.1']) {
      assert.deepEqual(reasoningParams(id), {}, id);
    }
  });
});

describe('toContentStream — OpenAI', () => {
  it('concatenates delta content and skips empty deltas', async () => {
    async function* chunks(): AsyncIterable<unknown> {
      yield { choices: [{ delta: { content: 'Hel' } }] };
      yield { choices: [{ delta: {} }] };
      yield { choices: [{ delta: { content: 'lo' } }] };
    }
    let out = '';
    for await (const s of openAiStream(cast(chunks()))) {
      out += s;
    }
    assert.equal(out, 'Hello');
  });

  it('re-throws a classified ProviderError on a mid-stream throw', async () => {
    async function* boom(): AsyncIterable<unknown> {
      yield { choices: [{ delta: { content: 'x' } }] };
      throw new Error('socket reset');
    }
    await assert.rejects(
      (async () => {
        for await (const _s of openAiStream(cast(boom()))) {
          /* drain */
        }
      })(),
      (e: unknown) => (e as { _tag?: string })._tag === 'Network',
    );
  });
});

describe('toContentStream — Anthropic', () => {
  it('yields only text_delta events', async () => {
    async function* events(): AsyncIterable<unknown> {
      yield { type: 'message_start' };
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hi ' } };
      yield { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{}' } };
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'there' } };
    }
    let out = '';
    for await (const s of anthropicStream(cast(events()))) {
      out += s;
    }
    assert.equal(out, 'Hi there');
  });
});

describe('createModelGateway dispatch', () => {
  const recorder = (): {
    adapter: ProviderAdapter;
    verified: Array<Redacted<ApiKey>>;
    streamed: ProviderRequest[];
  } => {
    const verified: Array<Redacted<ApiKey>> = [];
    const streamed: ProviderRequest[] = [];
    const adapter: ProviderAdapter = {
      verify: async (key) => {
        verified.push(key);
        return ok(undefined);
      },
      streamTheme: async (req) => {
        streamed.push(req);
        return ok((async function* () {})());
      },
    };
    return { adapter, verified, streamed };
  };

  const key = redact(('sk-' + 'x'.repeat(40)) as ApiKey);
  const model: ModelId = makeModel('anthropic', 'claude-x').id;

  it('routes to the adapter named by the request provider, dropping the provider field', async () => {
    const oa = recorder();
    const an = recorder();
    const gw = createModelGateway({ openai: oa.adapter, anthropic: an.adapter });

    await gw.streamTheme({
      provider: 'anthropic',
      key,
      model,
      system: 'sys' as NonEmptyString,
      user: 'usr' as NonEmptyString,
    });
    assert.equal(an.streamed.length, 1);
    assert.equal(oa.streamed.length, 0);
    const req = an.streamed[0];
    assert.ok(req);
    assert.equal(modelText(req.model), 'claude-x');
    assert.equal(Object.prototype.hasOwnProperty.call(req, 'provider'), false);

    await gw.verify('openai', key);
    assert.equal(oa.verified.length, 1);
    assert.equal(an.verified.length, 0);
  });
});
