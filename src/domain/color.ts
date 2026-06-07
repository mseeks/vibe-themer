/**
 * `ColorValue` — the only representation of a color the rest of the system accepts.
 * A value exists in exactly one of three shapes: a normalized hex string, a CSS
 * keyword, or the `Remove` sentinel used during iteration to clear an override.
 * Arbitrary strings cannot enter; `parseColor` is the sole constructor.
 */

import { type Brand, matchTag, Result, type ResultType } from '../fp';
import { malformed, type ValidationError } from './errors';

/** A lowercase `#rgb` / `#rgba` / `#rrggbb` / `#rrggbbaa` string, proven by construction. */
export type HexColor = Brand<string, 'HexColor'>;

export type NamedColor = 'transparent' | 'inherit' | 'initial' | 'unset';

export type ColorValue =
  | { readonly _tag: 'Hex'; readonly value: HexColor }
  | { readonly _tag: 'Named'; readonly value: NamedColor }
  | { readonly _tag: 'Remove' };

// 3/4/6/8 digits — all the hex forms VS Code's color customizations accept
// (#rgb, #rgba, #rrggbb, #rrggbbaa). Omitting #rgba meant a valid color counted
// as a malformed line toward the abort budget.
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NAMED: ReadonlySet<string> = new Set<NamedColor>([
  'transparent',
  'inherit',
  'initial',
  'unset',
]);
const REMOVE_SENTINEL = 'REMOVE';

export const remove: ColorValue = { _tag: 'Remove' };
export const hex = (value: HexColor): ColorValue => ({ _tag: 'Hex', value });
export const named = (value: NamedColor): ColorValue => ({ _tag: 'Named', value });

export const parseColor = (raw: string): ResultType<ValidationError, ColorValue> => {
  const trimmed = raw.trim();

  if (trimmed.toUpperCase() === REMOVE_SENTINEL) {
    return Result.ok(remove);
  }
  if (HEX_RE.test(trimmed)) {
    return Result.ok(hex(trimmed.toLowerCase() as HexColor));
  }
  const lower = trimmed.toLowerCase();
  if (NAMED.has(lower)) {
    return Result.ok(named(lower as NamedColor));
  }
  return Result.err(
    malformed('color', 'a hex code (#rgb/#rgba/#rrggbb/#rrggbbaa), a CSS keyword, or REMOVE', trimmed),
  );
};

/**
 * How a color resolves against VS Code config: either set a string value, or delete
 * the key entirely (the `Remove` case, which lets the base theme show through).
 */
export type ColorApplication =
  | { readonly _tag: 'Set'; readonly value: string }
  | { readonly _tag: 'Delete' };

export const toApplication = (color: ColorValue): ColorApplication =>
  matchTag(color, {
    Hex: ({ value }) => ({ _tag: 'Set', value }),
    Named: ({ value }) => ({ _tag: 'Set', value }),
    Remove: () => ({ _tag: 'Delete' }),
  });
