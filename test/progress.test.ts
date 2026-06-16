import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_MESSAGE_GAP_MS,
  markShown,
  neverShown,
  progressPercent,
  recoveryMessage,
  shouldShowMessage,
} from '../src/application/progress';
import { coverage } from '../src/domain/coverage';
import { type Millis } from '../src/ports';

const ms = (n: number): Millis => n as Millis;

describe('progressPercent', () => {
  it('is proportional, floored, and capped at 99 until completion', () => {
    assert.equal(progressPercent(0, 100), 0);
    assert.equal(progressPercent(50, 100), 50);
    assert.equal(progressPercent(100, 100), 99);
    assert.equal(progressPercent(5, 0), 0);
  });
});

describe('shouldShowMessage — first message always shows (v1 throttle bug fixed)', () => {
  it('shows the first message regardless of clock value', () => {
    assert.equal(shouldShowMessage(neverShown, ms(0)), true);
    assert.equal(shouldShowMessage(neverShown, ms(123456)), true);
  });

  it('throttles later messages by the minimum gap', () => {
    const shownAt = markShown(ms(1000));
    assert.equal(shouldShowMessage(shownAt, ms(1000 + MIN_MESSAGE_GAP_MS - 1)), false);
    assert.equal(shouldShowMessage(shownAt, ms(1000 + MIN_MESSAGE_GAP_MS)), true);
  });
});

describe('coverage — relative to the estimate, not fixed thresholds', () => {
  it('labels by ratio so a small-but-complete theme is not "partial"', () => {
    assert.equal(coverage(10, 100), 'partial');
    assert.equal(coverage(60, 100), 'good');
    assert.equal(coverage(90, 100), 'comprehensive');
    assert.equal(coverage(45, 50), 'comprehensive');
    assert.equal(coverage(5, 0), 'comprehensive');
  });
});

describe('recoveryMessage', () => {
  it('names the spent budget so an approaching abort is not a surprise', () => {
    assert.ok(recoveryMessage(2, 5).includes('2/5'));
    assert.ok(recoveryMessage(4, 5).includes('4/5'));
  });
});
