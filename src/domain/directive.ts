/**
 * `StreamingDirective` — one decoded line of the model's output stream. The wire
 * protocol has exactly four shapes (COUNT / SELECTOR / TOKEN / MESSAGE) and this
 * union is their typed form. The streaming parser produces these; the application
 * consumes them through an exhaustive match.
 */

import {
  type Brand,
  type NonEmptyString,
  type OptionType,
  Result,
  type ResultType,
} from '../fp';
import type { ColorValue } from './color';
import { malformed, type ValidationError } from './errors';
import type { FontStyle } from './fontStyle';
import type { WorkbenchSelector } from './selector';
import type { TokenScope } from './tokenScope';

export type PositiveInt = Brand<number, 'PositiveInt'>;

export const parsePositiveInt = (raw: string): ResultType<ValidationError, PositiveInt> => {
  const trimmed = raw.trim();
  const n = Number.parseInt(trimmed, 10);
  return Number.isInteger(n) && n > 0 && String(n) === trimmed
    ? Result.ok(n as PositiveInt)
    : Result.err(malformed('count', 'a positive integer', trimmed));
};

export type StreamingDirective =
  | { readonly _tag: 'Count'; readonly total: PositiveInt }
  | { readonly _tag: 'Selector'; readonly selector: WorkbenchSelector; readonly color: ColorValue }
  | {
      readonly _tag: 'Token';
      readonly scope: TokenScope;
      readonly color: ColorValue;
      readonly fontStyle: OptionType<FontStyle>;
    }
  | { readonly _tag: 'Message'; readonly text: NonEmptyString };

export const count = (total: PositiveInt): StreamingDirective => ({ _tag: 'Count', total });

export const selectorDirective = (
  selector: WorkbenchSelector,
  color: ColorValue,
): StreamingDirective => ({ _tag: 'Selector', selector, color });

export const tokenDirective = (
  scope: TokenScope,
  color: ColorValue,
  fontStyle: OptionType<FontStyle>,
): StreamingDirective => ({ _tag: 'Token', scope, color, fontStyle });

export const message = (text: NonEmptyString): StreamingDirective => ({ _tag: 'Message', text });
