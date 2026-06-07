import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseLine } from '../src/protocol/streamingParser';
import { type StreamingDirective } from '../src/domain/directive';
import { type ColorValue } from '../src/domain/color';

const directive = (line: string): StreamingDirective => {
  const r = parseLine(line);
  if (r._tag !== 'Ok') {
    throw new Error(`expected Ok, got ${JSON.stringify(r)}`);
  }
  return r.value;
};

const errorTag = (line: string): string => {
  const r = parseLine(line);
  if (r._tag !== 'Err') {
    throw new Error(`expected Err, got ${JSON.stringify(r)}`);
  }
  return r.error._tag;
};

const colorOf = (line: string): ColorValue => {
  const d = directive(line);
  if (d._tag === 'Selector' || d._tag === 'Token') {
    return d.color;
  }
  throw new Error(`directive ${d._tag} has no color`);
};

describe('parseLine — COUNT', () => {
  it('parses a positive integer', () => {
    assert.deepEqual(directive('COUNT:125'), { _tag: 'Count', total: 125 });
  });

  it('rejects non-numbers, zero, negatives, and trailing junk', () => {
    assert.equal(errorTag('COUNT:abc'), 'MalformedField');
    assert.equal(errorTag('COUNT:0'), 'MalformedField');
    assert.equal(errorTag('COUNT:-5'), 'MalformedField');
    assert.equal(errorTag('COUNT:12abc'), 'MalformedField');
    assert.equal(errorTag('COUNT:'), 'MalformedField');
  });
});

describe('parseLine — SELECTOR', () => {
  it('parses selector=hex, normalizing case', () => {
    assert.deepEqual(directive('SELECTOR:editor.background=#1A1A1A'), {
      _tag: 'Selector',
      selector: 'editor.background',
      color: { _tag: 'Hex', value: '#1a1a1a' },
    });
  });

  it('accepts 3- and 8-digit hex and CSS keywords', () => {
    assert.deepEqual(colorOf('SELECTOR:a.b=#fff'), { _tag: 'Hex', value: '#fff' });
    assert.deepEqual(colorOf('SELECTOR:a.b=#11223344'), { _tag: 'Hex', value: '#11223344' });
    assert.deepEqual(colorOf('SELECTOR:a.b=transparent'), { _tag: 'Named', value: 'transparent' });
  });

  it('parses REMOVE for iteration', () => {
    assert.deepEqual(colorOf('SELECTOR:editor.background=REMOVE'), { _tag: 'Remove' });
    assert.deepEqual(colorOf('SELECTOR:editor.background=remove'), { _tag: 'Remove' });
  });

  it('rejects a missing delimiter, bad selector, and bad color', () => {
    assert.equal(errorTag('SELECTOR:editor.background'), 'MissingDelimiter');
    assert.equal(errorTag('SELECTOR:has spaces=#fff'), 'MalformedField');
    assert.equal(errorTag('SELECTOR:editor.background=notacolor'), 'MalformedField');
  });
});

describe('parseLine — TOKEN', () => {
  it('parses scope=color with no font style', () => {
    assert.deepEqual(directive('TOKEN:comment=#6a9955'), {
      _tag: 'Token',
      scope: 'comment',
      color: { _tag: 'Hex', value: '#6a9955' },
      fontStyle: { _tag: 'None' },
    });
  });

  it('parses an optional font style and dotted/hyphenated scopes', () => {
    const d = directive('TOKEN:comment.line.double-slash=#6a9955,italic');
    assert.equal(d._tag, 'Token');
    if (d._tag === 'Token') {
      assert.equal(d.scope, 'comment.line.double-slash');
      assert.deepEqual(d.fontStyle, { _tag: 'Some', value: 'italic' });
    }
  });

  it('accepts combined font styles and rejects garbage styles', () => {
    const d = directive('TOKEN:keyword=#fff,bold italic');
    assert.equal(d._tag, 'Token');
    if (d._tag === 'Token') {
      assert.deepEqual(d.fontStyle, { _tag: 'Some', value: 'bold italic' });
    }
    assert.equal(errorTag('TOKEN:keyword=#fff,sparkly'), 'MalformedField');
  });
});

describe('parseLine — MESSAGE and unknown', () => {
  it('parses non-empty message text', () => {
    assert.deepEqual(directive('MESSAGE:Warming up the editor 🔥'), {
      _tag: 'Message',
      text: 'Warming up the editor 🔥',
    });
  });

  it('rejects empty messages and unknown directives', () => {
    assert.equal(errorTag('MESSAGE:   '), 'EmptyMessage');
    assert.equal(errorTag('NONSENSE:foo'), 'UnknownDirective');
    assert.equal(errorTag(''), 'UnknownDirective');
  });
});
