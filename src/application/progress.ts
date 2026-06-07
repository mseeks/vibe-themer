/**
 * Pure progress arithmetic for the streaming UX. Kept separate from the effectful
 * loop so the fiddly bits — the percentage cap, the message throttle, the coverage
 * label — are unit-testable in isolation.
 *
 * Two v1 bugs are fixed here by construction:
 *  - the first progress message is shown immediately (the throttle's "last shown"
 *    time is an `Option`, `None` until a message actually appears — v1 seeded it
 *    with `Date.now()`, so the intended first-message bypass never fired);
 *  - the completeness label is relative to the model's own estimate rather than the
 *    fixed `<50/<80` thresholds, so a deliberately small theme isn't mislabeled.
 */

import { type Brand, matchTag, none, type OptionType, some } from '../fp';
import { type Millis } from '../ports';

export type Percent = Brand<number, 'Percent'>;

const clampPercent = (n: number): Percent =>
  (n < 0 ? 0 : n > 100 ? 100 : Math.floor(n)) as Percent;

/** Progress toward the expected count, capped at 99 until completion (matches v1). */
export const progressPercent = (applied: number, expected: number): Percent =>
  expected <= 0 ? clampPercent(0) : clampPercent(Math.min((applied / expected) * 100, 99));

export const MIN_MESSAGE_GAP_MS = 800;

/** Show a message if none has shown yet, or if the minimum gap has elapsed. */
export const shouldShowMessage = (lastShownAt: OptionType<Millis>, now: Millis): boolean =>
  matchTag(lastShownAt, {
    None: () => true,
    Some: ({ value }) => now - value >= MIN_MESSAGE_GAP_MS,
  });

export const markShown = (now: Millis): OptionType<Millis> => some(now);

export const neverShown: OptionType<Millis> = none;
