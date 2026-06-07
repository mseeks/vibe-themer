import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyColor, applyTokenRule, type TextMateRule } from '../src/domain/customizations';
import { parseColor } from '../src/domain/color';
import { parseSelector } from '../src/domain/selector';
import { parseTokenScope } from '../src/domain/tokenScope';
import { parseFontStyle } from '../src/domain/fontStyle';
import { none, type OptionType, some } from '../src/fp';
import { type FontStyle } from '../src/domain/fontStyle';

const sel = (s: string) => {
  const r = parseSelector(s);
  if (r._tag !== 'Ok') { throw new Error(`bad selector: ${s}`); }
  return r.value;
};
const col = (s: string) => {
  const r = parseColor(s);
  if (r._tag !== 'Ok') { throw new Error(`bad color: ${s}`); }
  return r.value;
};
const scope = (s: string) => {
  const r = parseTokenScope(s);
  if (r._tag !== 'Ok') { throw new Error(`bad scope: ${s}`); }
  return r.value;
};
const style = (s: string): OptionType<FontStyle> => {
  const r = parseFontStyle(s);
  if (r._tag !== 'Ok') { throw new Error(`bad font style: ${s}`); }
  return some(r.value);
};

describe('applyColor', () => {
  it('sets and overwrites', () => {
    assert.deepEqual(applyColor({}, sel('editor.background'), col('#111111')), {
      'editor.background': '#111111',
    });
    assert.deepEqual(applyColor({ 'editor.background': '#000000' }, sel('editor.background'), col('#ffffff')), {
      'editor.background': '#ffffff',
    });
  });

  it('deletes an existing key on REMOVE and is a no-op on an absent key', () => {
    assert.deepEqual(applyColor({ 'a.b': '#111111', 'c.d': '#222222' }, sel('a.b'), col('REMOVE')), {
      'c.d': '#222222',
    });
    assert.deepEqual(applyColor({ 'c.d': '#222222' }, sel('a.b'), col('REMOVE')), {
      'c.d': '#222222',
    });
  });

  it('does not mutate its input', () => {
    const input = { 'a.b': '#111111' };
    applyColor(input, sel('x.y'), col('#222222'));
    assert.deepEqual(input, { 'a.b': '#111111' });
  });
});

describe('applyTokenRule', () => {
  it('adds a rule, with or without a font style', () => {
    assert.deepEqual(applyTokenRule([], scope('comment'), col('#6a9955'), style('italic')), [
      { scope: 'comment', settings: { foreground: '#6a9955', fontStyle: 'italic' } },
    ]);
    assert.deepEqual(applyTokenRule([], scope('keyword'), col('#ff0000'), none), [
      { scope: 'keyword', settings: { foreground: '#ff0000' } },
    ]);
  });

  it('replaces the rule for the same scope', () => {
    const before: TextMateRule[] = [{ scope: 'comment', settings: { foreground: '#000000' } }];
    assert.deepEqual(applyTokenRule(before, scope('comment'), col('#6a9955'), none), [
      { scope: 'comment', settings: { foreground: '#6a9955' } },
    ]);
  });

  it('removes the rule on REMOVE, including an array-valued scope', () => {
    const before: TextMateRule[] = [
      { scope: ['string', 'punctuation'], settings: { foreground: '#aaaaaa' } },
      { scope: 'comment', settings: { foreground: '#000000' } },
    ];
    assert.deepEqual(applyTokenRule(before, scope('string'), col('REMOVE'), none), [
      { scope: 'comment', settings: { foreground: '#000000' } },
    ]);
  });
});
