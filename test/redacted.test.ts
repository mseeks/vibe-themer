import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expose, redact } from '../src/fp';

describe('Redacted — the key cannot leak through logging', () => {
  it('renders as a placeholder everywhere, revealing only via expose', () => {
    const r = redact('sk-super-secret-value');
    assert.equal(String(r), '<redacted>');
    assert.equal(`${r}`, '<redacted>');
    assert.equal(JSON.stringify(r), '"<redacted>"');
    assert.equal(
      JSON.stringify({ clientState: { apiKey: r } }),
      '{"clientState":{"apiKey":"<redacted>"}}',
    );
    assert.equal(expose(r), 'sk-super-secret-value');
  });
});
