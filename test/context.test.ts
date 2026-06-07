import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildUserPrompt } from '../src/application/context';
import { parseVibe } from '../src/domain/vibe';
import { type CurrentTheme } from '../src/domain/theme';

const vibe = (s: string) => {
  const r = parseVibe(s);
  if (r._tag !== 'Ok') { throw new Error(`bad vibe: ${s}`); }
  return r.value;
};

const empty: CurrentTheme = {
  global: { colors: {}, tokens: {} },
  workspace: { colors: {}, tokens: {} },
};

describe('buildUserPrompt', () => {
  it('uses the plain form when there are no customizations', () => {
    assert.equal(buildUserPrompt(empty, vibe('cozy autumn')), 'Theme description: cozy autumn');
  });

  it('injects current customizations from both scopes for iteration', () => {
    const current: CurrentTheme = {
      global: { colors: { 'editor.background': '#1e1e1e' }, tokens: {} },
      workspace: {
        colors: { 'activityBar.background': '#2d2d2d' },
        tokens: { comments: '#6a9955' },
      },
    };
    const out = buildUserPrompt(current, vibe('make it warmer'));
    assert.ok(out.includes('CURRENT THEME CONTEXT:'));
    assert.ok(out.includes('editor.background: #1e1e1e'));
    assert.ok(out.includes('activityBar.background: #2d2d2d'));
    assert.ok(out.includes('Active syntax highlighting overrides'));
    assert.ok(out.endsWith('make it warmer'));
  });
});
