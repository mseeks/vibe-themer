/**
 * The streaming wire protocol, as a grammar.
 *
 * The model emits one directive per line: `COUNT:n`, `SELECTOR:key=color`,
 * `TOKEN:scope=color[,fontStyle]`, or `MESSAGE:text`. Structure is recognized with
 * the parser combinators (`fp/parser`); the *fields* are then validated by the
 * domain smart constructors, so a parsed directive is fully well-typed — an invalid
 * color or selector can never ride along inside one.
 *
 * Two channels of failure are distinguished: a line that matches no directive
 * (`UnknownDirective`) versus a recognized directive whose fields don't validate
 * (`MalformedField`/`MissingDelimiter`/`EmptyMessage`). The application treats both
 * as recoverable and tolerates a bounded number before giving up.
 */

import {
  isNonEmptyString,
  matchTag,
  none,
  Option,
  type OptionType,
  P,
  pipe,
  Result,
  type ResultType,
  some,
} from '../fp';
import { parseColor } from '../domain/color';
import {
  count,
  message,
  parsePositiveInt,
  selectorDirective,
  type StreamingDirective,
  tokenDirective,
} from '../domain/directive';
import { type ValidationError } from '../domain/errors';
import { type FontStyle, parseFontStyle } from '../domain/fontStyle';
import { parseSelector } from '../domain/selector';
import { parseTokenScope } from '../domain/tokenScope';

export type ParseError =
  | { readonly _tag: 'UnknownDirective'; readonly line: string }
  | { readonly _tag: 'MissingDelimiter'; readonly expected: string; readonly line: string }
  | { readonly _tag: 'MalformedField'; readonly cause: ValidationError }
  | { readonly _tag: 'EmptyMessage' };

const malformedField = (cause: ValidationError): ParseError => ({ _tag: 'MalformedField', cause });

// ── Structural layer: split a line into (directive kind, raw payload) ──────────

type RawDirective =
  | { readonly _tag: 'Count'; readonly payload: string }
  | { readonly _tag: 'Selector'; readonly payload: string }
  | { readonly _tag: 'Token'; readonly payload: string }
  | { readonly _tag: 'Message'; readonly payload: string };

const tagged = (tag: RawDirective['_tag'], prefix: string): P.Parser<RawDirective> =>
  pipe(
    P.literal(prefix),
    P.then(P.rest),
    P.map((payload): RawDirective => ({ _tag: tag, payload }) as RawDirective),
  );

const directiveStructure: P.Parser<RawDirective> = P.oneOf([
  tagged('Count', 'COUNT:'),
  tagged('Selector', 'SELECTOR:'),
  tagged('Token', 'TOKEN:'),
  tagged('Message', 'MESSAGE:'),
]);

// ── Semantic layer: validate fields via the domain ────────────────────────────

/** Split on the first `=` only, so a value may itself contain `=` (it never does here). */
const splitAssignment = (payload: string): OptionType<{ name: string; value: string }> => {
  const i = payload.indexOf('=');
  return i < 0 ? none : some({ name: payload.slice(0, i), value: payload.slice(i + 1) });
};

const decodeFontStyle = (
  raw: OptionType<string>,
): ResultType<ValidationError, OptionType<FontStyle>> =>
  pipe(
    raw,
    Option.match({
      onNone: (): ResultType<ValidationError, OptionType<FontStyle>> => Result.ok(none),
      onSome: (s) => pipe(parseFontStyle(s), Result.map(some)),
    }),
  );

const decodeSelector = (payload: string): ResultType<ParseError, StreamingDirective> =>
  pipe(
    splitAssignment(payload),
    Option.match({
      onNone: (): ResultType<ParseError, StreamingDirective> =>
        Result.err({ _tag: 'MissingDelimiter', expected: 'selector=color', line: payload }),
      onSome: ({ name, value }) =>
        pipe(
          parseSelector(name),
          Result.flatMap((selector) =>
            pipe(
              parseColor(value),
              Result.map((color) => selectorDirective(selector, color)),
            ),
          ),
          Result.mapErr(malformedField),
        ),
    }),
  );

const decodeToken = (payload: string): ResultType<ParseError, StreamingDirective> =>
  pipe(
    splitAssignment(payload),
    Option.match({
      onNone: (): ResultType<ParseError, StreamingDirective> =>
        Result.err({ _tag: 'MissingDelimiter', expected: 'scope=color[,fontStyle]', line: payload }),
      onSome: ({ name, value }) => {
        const comma = value.indexOf(',');
        const colorRaw = comma < 0 ? value : value.slice(0, comma);
        const styleRaw: OptionType<string> = comma < 0 ? none : some(value.slice(comma + 1));
        return pipe(
          parseTokenScope(name),
          Result.flatMap((scope) =>
            pipe(
              parseColor(colorRaw),
              Result.flatMap((color) =>
                pipe(
                  decodeFontStyle(styleRaw),
                  Result.map((fontStyle) => tokenDirective(scope, color, fontStyle)),
                ),
              ),
            ),
          ),
          Result.mapErr(malformedField),
        );
      },
    }),
  );

const decode = (raw: RawDirective): ResultType<ParseError, StreamingDirective> =>
  matchTag(raw, {
    Count: ({ payload }) =>
      pipe(parsePositiveInt(payload), Result.map(count), Result.mapErr(malformedField)),
    Message: ({ payload }): ResultType<ParseError, StreamingDirective> => {
      const text = payload.trim();
      return isNonEmptyString(text) ? Result.ok(message(text)) : Result.err({ _tag: 'EmptyMessage' });
    },
    Selector: ({ payload }) => decodeSelector(payload),
    Token: ({ payload }) => decodeToken(payload),
  });

/** Parse a single line into a typed directive, or a categorized parse error. */
export const parseLine = (line: string): ResultType<ParseError, StreamingDirective> => {
  const trimmed = line.trim();
  const structure = P.run(directiveStructure, trimmed);
  return structure._tag === 'ParseOk'
    ? decode(structure.value)
    : Result.err({ _tag: 'UnknownDirective', line: trimmed });
};

export const renderParseError = (e: ParseError): string =>
  matchTag(e, {
    UnknownDirective: ({ line }) => `unrecognized directive: "${line}"`,
    MissingDelimiter: ({ expected }) => `missing delimiter (expected ${expected})`,
    MalformedField: ({ cause }) => cause._tag,
    EmptyMessage: () => 'empty message',
  });
