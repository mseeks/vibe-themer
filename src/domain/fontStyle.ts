/**
 * `FontStyle` — the optional styling on a token color rule. VS Code accepts either
 * the literal `none` or a space-separated subset of italic/bold/underline/
 * strikethrough. We validate to that grammar and normalize, so a rule can only ever
 * carry a font style VS Code understands.
 *
 * (v1 passed the raw substring through unchecked; this rejects genuine garbage while
 * still accepting every real style and combination.)
 */

import { type Brand, Result, type ResultType } from '../fp';
import { empty, malformed, type ValidationError } from './errors';

export type FontStyle = Brand<string, 'FontStyle'>;

const FLAGS: ReadonlySet<string> = new Set(['italic', 'bold', 'underline', 'strikethrough']);

export const parseFontStyle = (raw: string): ResultType<ValidationError, FontStyle> => {
  const normalized = raw.trim().toLowerCase();
  if (normalized.length === 0) {
    return Result.err(empty('font style'));
  }
  if (normalized === 'none') {
    return Result.ok('none' as FontStyle);
  }
  const flags = normalized.split(/\s+/);
  if (flags.every((flag) => FLAGS.has(flag))) {
    return Result.ok(flags.join(' ') as FontStyle);
  }
  return Result.err(
    malformed('font style', 'none, or italic/bold/underline/strikethrough', normalized),
  );
};

export const fontStyleText = (s: FontStyle): string => s;
