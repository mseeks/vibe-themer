/**
 * `Vibe` — the user's natural-language theme description, validated to the same rule
 * the v1 QuickPick enforced: non-empty after trimming, at least three characters.
 * Downstream code receives a `Vibe`, never a raw string, so "did we validate this?"
 * is answered by the type.
 */

import { type Brand, Result, type ResultType } from '../fp';
import { empty, tooShort, type ValidationError } from './errors';

export type Vibe = Brand<string, 'Vibe'>;

export const MIN_VIBE_LENGTH = 3;

export const parseVibe = (raw: string): ResultType<ValidationError, Vibe> => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return Result.err(empty('theme description'));
  }
  if (trimmed.length < MIN_VIBE_LENGTH) {
    return Result.err(tooShort('theme description', MIN_VIBE_LENGTH, trimmed.length));
  }
  return Result.ok(trimmed as Vibe);
};

export const vibeText = (v: Vibe): string => v;
