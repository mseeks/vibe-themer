import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  type CurrentTheme,
  effectiveColors,
  effectiveScope,
  hasCustomizations,
  parseColorMap,
  parseScopedTheme,
  parseTokenCustomizations,
  settingOf,
} from '../src/domain/theme';
import { parseLine } from '../src/protocol/streamingParser';
import { type StreamingDirective } from '../src/domain/directive';

const scoped = (colors: Record<string, string> = {}, tokens: Record<string, unknown> = {}) => ({
  colors,
  tokens,
});

const theme = (
  global: ReturnType<typeof scoped>,
  workspace: ReturnType<typeof scoped>,
): CurrentTheme => ({ global, workspace });

const directive = (line: string): StreamingDirective => {
  const r = parseLine(line);
  if (r._tag !== 'Ok') {
    throw new Error(`bad fixture: ${line}`);
  }
  return r.value;
};

describe('effectiveScope — v1 read both scopes from the same value; now they differ', () => {
  it('distinguishes none / global / workspace / both', () => {
    assert.deepEqual(effectiveScope(theme(scoped(), scoped())), { _tag: 'None' });
    assert.deepEqual(effectiveScope(theme(scoped({ 'editor.background': '#000' }), scoped())), {
      _tag: 'Global',
    });
    assert.deepEqual(effectiveScope(theme(scoped(), scoped({ 'editor.background': '#000' }))), {
      _tag: 'Workspace',
    });
    assert.deepEqual(effectiveScope(theme(scoped({ a: '#000' }), scoped({ b: '#111' }))), {
      _tag: 'Both',
    });
  });

  it('hasCustomizations reflects either scope', () => {
    assert.equal(hasCustomizations(theme(scoped(), scoped())), false);
    assert.equal(hasCustomizations(theme(scoped(), scoped({}, { textMateRules: [] }))), true);
  });
});

describe('effectiveColors precedence', () => {
  it('lets workspace override global', () => {
    const t = theme(
      scoped({ 'editor.background': '#000', x: '#1' }),
      scoped({ 'editor.background': '#fff' }),
    );
    assert.deepEqual(effectiveColors(t), { 'editor.background': '#fff', x: '#1' });
  });
});

describe('settingOf', () => {
  it('maps selector/token directives to settings and drops count/message', () => {
    assert.equal(settingOf(directive('SELECTOR:editor.background=#123'))._tag, 'Some');
    assert.equal(settingOf(directive('TOKEN:comment=#123,italic'))._tag, 'Some');
    assert.equal(settingOf(directive('COUNT:5'))._tag, 'None');
    assert.equal(settingOf(directive('MESSAGE:hi'))._tag, 'None');
  });
});

describe('parseColorMap — hand-edited config is parsed, not trusted', () => {
  it('keeps colors and per-theme blocks but drops corrupt scalars', () => {
    const themeBlock = { 'editor.background': '#222' };
    assert.deepEqual(
      parseColorMap({
        'editor.background': '#000',
        '[Default Dark+]': themeBlock,
        broken: 5,
        alsoBroken: ['#fff'],
        nope: null,
      }),
      { 'editor.background': '#000', '[Default Dark+]': themeBlock },
    );
  });

  it('degrades a non-object value to empty', () => {
    for (const bad of ['nope', 42, null, undefined, ['#000']]) {
      assert.deepEqual(parseColorMap(bad), {});
    }
  });
});

describe('parseTokenCustomizations', () => {
  it('keeps a well-formed object whole and degrades anything else to empty', () => {
    const value = { textMateRules: [{ scope: 'comment', settings: {} }], semanticHighlighting: true };
    assert.deepEqual(parseTokenCustomizations(value), value);
    assert.deepEqual(parseTokenCustomizations(42), {});
    assert.deepEqual(parseTokenCustomizations([]), {});
  });
});

describe('parseScopedTheme', () => {
  it('parses colors and tokens together, dropping corrupt color entries', () => {
    assert.deepEqual(parseScopedTheme({ a: '#1', bad: 2 }, { textMateRules: [] }), {
      colors: { a: '#1' },
      tokens: { textMateRules: [] },
    });
  });
});
