import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseColor, toApplication } from '../src/domain/color';
import { parseVibe } from '../src/domain/vibe';
import { parseSelector } from '../src/domain/selector';
import { parseTokenScope } from '../src/domain/tokenScope';
import { parseFontStyle } from '../src/domain/fontStyle';
import { parseWriteTarget, writePreference } from '../src/domain/scope';
import { parseApiKey, renderApiKeyError } from '../src/domain/apiKey';
import {
  CATALOG,
  DEFAULT_MODEL,
  makeModel,
  modelText,
  parseModel,
  parseModelId,
  sameModel,
} from '../src/domain/model';
import { expose } from '../src/fp';

describe('parseColor', () => {
  it('accepts 3/4/6/8-digit hex (lowercased), keywords, and REMOVE', () => {
    assert.deepEqual(parseColor('#ABC'), { _tag: 'Ok', value: { _tag: 'Hex', value: '#abc' } });
    assert.deepEqual(parseColor('#FFF8'), { _tag: 'Ok', value: { _tag: 'Hex', value: '#fff8' } });
    assert.deepEqual(parseColor('  #1e1e1e '), {
      _tag: 'Ok',
      value: { _tag: 'Hex', value: '#1e1e1e' },
    });
    assert.deepEqual(parseColor('UNSET'), { _tag: 'Ok', value: { _tag: 'Named', value: 'unset' } });
    assert.deepEqual(parseColor('remove'), { _tag: 'Ok', value: { _tag: 'Remove' } });
  });

  it('rejects malformed colors', () => {
    assert.equal(parseColor('blue')._tag, 'Err');
    assert.equal(parseColor('#12')._tag, 'Err');
    assert.equal(parseColor('rgb(0,0,0)')._tag, 'Err');
  });

  it('maps to an application instruction', () => {
    const hex = parseColor('#fff');
    if (hex._tag === 'Ok') {
      assert.deepEqual(toApplication(hex.value), { _tag: 'Set', value: '#fff' });
    }
    const rm = parseColor('REMOVE');
    if (rm._tag === 'Ok') {
      assert.deepEqual(toApplication(rm.value), { _tag: 'Delete' });
    }
  });
});

describe('parseVibe', () => {
  it('trims and requires at least three characters', () => {
    assert.equal(parseVibe('  cozy autumn  ')._tag, 'Ok');
    assert.equal(parseVibe('  ')._tag, 'Err');
    assert.equal(parseVibe('ab')._tag, 'Err');
  });
});

describe('parseSelector / parseTokenScope', () => {
  it('accepts dotted identifiers and rejects spaces or empties', () => {
    assert.equal(parseSelector('editorIndentGuide.activeBackground6')._tag, 'Ok');
    assert.equal(parseSelector('has space')._tag, 'Err');
    assert.equal(parseSelector('')._tag, 'Err');
    assert.equal(parseTokenScope('comment.line.double-slash')._tag, 'Ok');
    assert.equal(parseTokenScope('with=equals')._tag, 'Err');
  });
});

describe('writePreference', () => {
  it('orders targets by the user preference, with workspace gated on an open folder', () => {
    assert.deepEqual(writePreference('global', true), ['global', 'workspace']);
    assert.deepEqual(writePreference('global', false), ['global']);
    assert.deepEqual(writePreference('workspace', true), ['workspace', 'global']);
    // No folder open → workspace isn't a real target; fall through to global.
    assert.deepEqual(writePreference('workspace', false), ['global']);
  });
});

describe('parseWriteTarget', () => {
  it('accepts the two valid targets and rejects an absent or typo value', () => {
    assert.deepEqual(parseWriteTarget('global'), { _tag: 'Some', value: 'global' });
    assert.deepEqual(parseWriteTarget('workspace'), { _tag: 'Some', value: 'workspace' });
    assert.equal(parseWriteTarget('globel')._tag, 'None');
    assert.equal(parseWriteTarget(undefined)._tag, 'None');
  });
});

describe('parseFontStyle', () => {
  it('accepts none, single, and combined flags; rejects unknown', () => {
    assert.equal(parseFontStyle('none')._tag, 'Ok');
    assert.equal(parseFontStyle('Bold')._tag, 'Ok');
    assert.equal(parseFontStyle('bold underline')._tag, 'Ok');
    assert.equal(parseFontStyle('wobbly')._tag, 'Err');
  });
});

describe('parseApiKey', () => {
  it('validates the provider prefix and length, wrapping in Redacted', () => {
    const good = parseApiKey('openai', `sk-${'x'.repeat(40)}`);
    assert.equal(good._tag, 'Ok');
    if (good._tag === 'Ok') {
      assert.equal(String(good.value), '<redacted>');
      assert.equal(JSON.stringify({ key: good.value }), '{"key":"<redacted>"}');
      assert.equal(expose(good.value).startsWith('sk-'), true);
    }
    assert.equal(parseApiKey('anthropic', `sk-ant-${'x'.repeat(40)}`)._tag, 'Ok');
  });

  it('rejects empty, wrong-prefix, and too-short keys without echoing the key', () => {
    assert.deepEqual(parseApiKey('openai', ''), { _tag: 'Err', error: { _tag: 'KeyEmpty' } });
    assert.deepEqual(parseApiKey('openai', 'pk-123456789012345678901234'), {
      _tag: 'Err',
      error: { _tag: 'KeyBadPrefix', provider: 'openai' },
    });
    assert.deepEqual(parseApiKey('openai', 'sk-short'), {
      _tag: 'Err',
      error: { _tag: 'KeyTooShort' },
    });
    assert.equal(
      renderApiKeyError({ _tag: 'KeyBadPrefix', provider: 'openai' }).includes('pk-'),
      false,
    );
  });

  it('routes keys per provider — an Anthropic key is invalid for OpenAI and vice versa', () => {
    assert.deepEqual(parseApiKey('openai', `sk-ant-${'x'.repeat(40)}`), {
      _tag: 'Err',
      error: { _tag: 'KeyBadPrefix', provider: 'openai' },
    });
    assert.deepEqual(parseApiKey('anthropic', `sk-${'x'.repeat(40)}`), {
      _tag: 'Err',
      error: { _tag: 'KeyBadPrefix', provider: 'anthropic' },
    });
  });
});

describe('model & catalog', () => {
  it('defaults to gpt-5.5 on OpenAI', () => {
    assert.equal(DEFAULT_MODEL.provider, 'openai');
    assert.equal(modelText(DEFAULT_MODEL.id), 'gpt-5.5');
  });

  it('curates a small catalog that includes the default', () => {
    const ids = CATALOG.map((s) => modelText(s.model.id));
    assert.ok(ids.includes('gpt-5.5'));
    assert.ok(ids.includes('claude-sonnet-4-6'));
    assert.ok(ids.includes('claude-haiku-4-5'));
    assert.ok(CATALOG.some((s) => sameModel(s.model, DEFAULT_MODEL)));
  });

  it('parses a custom id and compares models by provider + id', () => {
    assert.equal(parseModelId('gpt-4o')._tag, 'Some');
    assert.equal(parseModelId('   ')._tag, 'None');
    assert.equal(sameModel(makeModel('openai', 'x'), makeModel('openai', 'x')), true);
    assert.equal(sameModel(makeModel('openai', 'x'), makeModel('anthropic', 'x')), false);
  });

  it('parseModel builds a model from a valid id and rejects a blank one', () => {
    const built = parseModel('anthropic', '  claude-sonnet-4-6  ');
    assert.equal(built._tag, 'Some');
    if (built._tag === 'Some') {
      assert.ok(sameModel(built.value, makeModel('anthropic', 'claude-sonnet-4-6')));
    }
    assert.equal(parseModel('openai', '   ')._tag, 'None');
  });
});
