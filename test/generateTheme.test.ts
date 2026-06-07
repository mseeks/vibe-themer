import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateTheme } from '../src/application/generateTheme';
import { makeModel } from '../src/domain/model';
import { harness } from './support/harness';

const VALID_KEY = `sk-${'x'.repeat(40)}`;

const HAPPY_STREAM = [
  'COUNT:3',
  'MESSAGE:Warming up the editor 🔥',
  'SELECTOR:editor.background=#1a1a1a',
  'TOKEN:comment=#6a9955,italic',
  'SELECTOR:activityBar.background=REMOVE',
  '',
].join('\n');

describe('generateTheme — happy path', () => {
  it('applies each setting live and completes', async () => {
    const h = harness({ storedKey: VALID_KEY, vibe: 'cozy autumn evening', streamText: HAPPY_STREAM });
    const result = await generateTheme(h.caps);

    assert.equal(result._tag, 'Ok');
    if (result._tag === 'Ok') {
      assert.deepEqual(result.value, { _tag: 'Completed', applied: 3 });
    }
    assert.equal(h.colors.get('editor.background'), '#1a1a1a');
    assert.equal(h.colors.has('activityBar.background'), false);
    assert.deepEqual(h.tokenRules, [
      { scope: 'comment', settings: { foreground: '#6a9955', fontStyle: 'italic' } },
    ]);
  });

  it('REMOVE deletes a previously applied selector (iteration)', async () => {
    const text = ['COUNT:2', 'SELECTOR:foo.bar=#111111', 'SELECTOR:foo.bar=REMOVE', ''].join('\n');
    const h = harness({ storedKey: VALID_KEY, vibe: 'make it warmer', streamText: text });
    const result = await generateTheme(h.caps);

    assert.equal(h.colors.has('foo.bar'), false);
    if (result._tag === 'Ok') {
      assert.equal(result.value._tag, 'Completed');
    }
  });

  it('injects existing customizations into the streamed prompt for iteration', async () => {
    const currentTheme = {
      global: { colors: { 'editor.background': '#1e1e1e' }, tokens: {} },
      workspace: { colors: {}, tokens: {} },
    };
    const text = ['COUNT:1', 'SELECTOR:editor.background=#2a1f1a', ''].join('\n');
    const h = harness({ storedKey: VALID_KEY, vibe: 'make it warmer', streamText: text, currentTheme });
    await generateTheme(h.caps);

    assert.ok(h.captured.streamUserPrompt.includes('CURRENT THEME CONTEXT:'));
    assert.ok(h.captured.streamUserPrompt.includes('editor.background: #1e1e1e'));
    assert.ok(h.captured.streamUserPrompt.endsWith('make it warmer'));
  });

  it('prompts for, verifies, and stores a new key, then proceeds', async () => {
    const text = ['COUNT:1', 'SELECTOR:editor.background=#000000', ''].join('\n');
    const h = harness({ promptKey: VALID_KEY, vibe: 'minimal dark', streamText: text });
    const result = await generateTheme(h.caps);

    assert.equal(h.captured.keySet, true);
    if (result._tag === 'Ok') {
      assert.equal(result.value._tag, 'Completed');
    }
  });

  it('routes to Anthropic when a Claude model is selected, storing an sk-ant- key', async () => {
    const anthropicKey = `sk-ant-${'x'.repeat(40)}`;
    const text = ['COUNT:1', 'SELECTOR:editor.background=#101010', ''].join('\n');
    const h = harness({
      selectedModel: makeModel('anthropic', 'claude-sonnet-4-6'),
      promptKey: anthropicKey,
      vibe: 'calm ocean depths',
      streamText: text,
    });
    const result = await generateTheme(h.caps);

    assert.deepEqual(h.captured.keySetProviders, ['anthropic']);
    assert.equal(h.colors.get('editor.background'), '#101010');
    if (result._tag === 'Ok') {
      assert.equal(result.value._tag, 'Completed');
    }
  });
});

describe('generateTheme — benign exits', () => {
  it('returns NoVibe when the picker is dismissed', async () => {
    const h = harness({ storedKey: VALID_KEY });
    assert.deepEqual(await generateTheme(h.caps), { _tag: 'Ok', value: { _tag: 'NoVibe' } });
  });

  it('returns NoKey when no key is stored and the prompt is dismissed', async () => {
    const h = harness({ vibe: 'cozy autumn' });
    assert.deepEqual(await generateTheme(h.caps), { _tag: 'Ok', value: { _tag: 'NoKey' } });
  });
});

describe('generateTheme — failures', () => {
  it('surfaces a provider stream error', async () => {
    const h = harness({ storedKey: VALID_KEY, vibe: 'cozy', streamError: { _tag: 'RateLimited' } });
    assert.deepEqual(await generateTheme(h.caps), {
      _tag: 'Err',
      error: { _tag: 'Provider', error: { _tag: 'RateLimited' } },
    });
  });

  it('aborts after too many malformed lines', async () => {
    const garbage = Array.from({ length: 6 }, (_unused, i) => `GARBAGE:${i}`).join('\n');
    const h = harness({ storedKey: VALID_KEY, vibe: 'cozy', streamText: garbage });
    const result = await generateTheme(h.caps);
    assert.equal(result._tag, 'Err');
    if (result._tag === 'Err') {
      assert.equal(result.error._tag, 'Aborted');
    }
  });
});

describe('generateTheme — cancellation and reset', () => {
  it('on cancel + reset, clears the theme', async () => {
    const h = harness({
      storedKey: VALID_KEY,
      vibe: 'cozy',
      streamText: HAPPY_STREAM,
      cancelAfterReports: 2,
      cancellationChoice: 'reset',
    });
    const result = await generateTheme(h.caps);
    if (result._tag === 'Ok') {
      assert.equal(result.value._tag, 'CancelledReset');
    }
    assert.ok(h.captured.resets >= 1);
  });

  it('on success + reset choice, clears the theme', async () => {
    const h = harness({
      storedKey: VALID_KEY,
      vibe: 'cozy',
      streamText: HAPPY_STREAM,
      completionChoice: 'reset',
    });
    const result = await generateTheme(h.caps);
    if (result._tag === 'Ok') {
      assert.equal(result.value._tag, 'Completed');
    }
    assert.equal(h.captured.resets, 1);
  });
});

describe('generateTheme — secret safety', () => {
  it('never lets the raw API key reach logs or notifications', async () => {
    const h = harness({ storedKey: VALID_KEY, vibe: 'cozy autumn', streamText: HAPPY_STREAM });
    await generateTheme(h.caps);
    const serialized = JSON.stringify(h.captured);
    assert.equal(serialized.includes('sk-'), false);
    assert.equal(serialized.includes('x'.repeat(40)), false);
  });
});
