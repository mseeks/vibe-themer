/**
 * Validation failures from smart constructors, as a closed tagged union. Rendering
 * is centralized so user-facing copy lives in one place and exhaustiveness is
 * enforced. Note: these errors never carry secret material — see `apiKey.ts` for
 * the key-specific error type that deliberately omits the raw value.
 */

import { matchTag } from '../fp';

export type ValidationError =
  | { readonly _tag: 'Empty'; readonly field: string }
  | { readonly _tag: 'TooShort'; readonly field: string; readonly min: number; readonly actual: number }
  | {
      readonly _tag: 'Malformed';
      readonly field: string;
      readonly expected: string;
      readonly received: string;
    };

export const empty = (field: string): ValidationError => ({ _tag: 'Empty', field });

export const tooShort = (field: string, min: number, actual: number): ValidationError => ({
  _tag: 'TooShort',
  field,
  min,
  actual,
});

export const malformed = (field: string, expected: string, received: string): ValidationError => ({
  _tag: 'Malformed',
  field,
  expected,
  received,
});

export const renderValidationError = (e: ValidationError): string =>
  matchTag(e, {
    Empty: ({ field }) => `${field} must not be empty`,
    TooShort: ({ field, min, actual }) =>
      `${field} is too short (${actual} chars; need at least ${min})`,
    Malformed: ({ field, expected, received }) =>
      `${field} is malformed: expected ${expected}, got "${received}"`,
  });
