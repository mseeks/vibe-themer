import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseColor, toApplication } from '../src/domain/color';
import { parseVibe } from '../src/domain/vibe';
import { parseSelector } from '../src/domain/selector';
import { parseTokenScope } from '../src/domain/tokenScope';
import { parseFontStyle } from '../src/domain/fontStyle';
import { parseApiKey, renderApiKeyError } from '../src/domain/apiKey';
import { DEFAULT_MODEL, isGptModel, parseModelId } from '../src/domain/model';
import { expose } from '../src/fp';

describe('parseColor', () => {
  it('accepts 3/6/8-digit hex (lowercased), keywords, and REMOVE', () => {
    assert.deepEqual(parseColor('#ABC'), { _tag: 'Ok', value: { _tag: 'Hex', value: '#abc' } });
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

describe('parseFontStyle', () => {
  it('accepts none, single, and combined flags; rejects unknown', () => {
    assert.equal(parseFontStyle('none')._tag, 'Ok');
    assert.equal(parseFontStyle('Bold')._tag, 'Ok');
    assert.equal(parseFontStyle('bold underline')._tag, 'Ok');
    assert.equal(parseFontStyle('wobbly')._tag, 'Err');
  });
});

describe('parseApiKey', () => {
  it('validates the sk- prefix and length, and wraps in Redacted', () => {
    const good = parseApiKey(`sk-${'x'.repeat(40)}`);
    assert.equal(good._tag, 'Ok');
    if (good._tag === 'Ok') {
      assert.equal(String(good.value), '<redacted>');
      assert.equal(JSON.stringify({ key: good.value }), '{"key":"<redacted>"}');
      assert.equal(expose(good.value).startsWith('sk-'), true);
    }
  });

  it('rejects empty, bad prefix, and too-short keys without echoing the key', () => {
    assert.deepEqual(parseApiKey(''), { _tag: 'Err', error: { _tag: 'KeyEmpty' } });
    assert.deepEqual(parseApiKey('pk-123456789012345678901234'), {
      _tag: 'Err',
      error: { _tag: 'KeyBadPrefix' },
    });
    assert.deepEqual(parseApiKey('sk-short'), { _tag: 'Err', error: { _tag: 'KeyTooShort' } });
    assert.equal(renderApiKeyError({ _tag: 'KeyBadPrefix' }).includes('pk-'), false);
  });
});

describe('model', () => {
  it('defaults to gpt-4.1 and recognizes GPT ids', () => {
    assert.equal(String(DEFAULT_MODEL), 'gpt-4.1');
    const m = parseModelId('gpt-4o');
    assert.equal(m._tag, 'Some');
    if (m._tag === 'Some') {
      assert.equal(isGptModel(m.value), true);
    }
    const c = parseModelId('claude-3');
    if (c._tag === 'Some') {
      assert.equal(isGptModel(c.value), false);
    }
  });
});
