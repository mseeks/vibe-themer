/**
 * A minimal parser-combinator kernel. A `Parser<A>` consumes the front of a string
 * and either yields a value plus the remaining input, or an error. Combinators
 * compose small parsers into larger ones, letting the streaming protocol be
 * expressed as a grammar (see `protocol/streamingParser.ts`) rather than a tangle
 * of `startsWith`/`split`/`indexOf`.
 */

export interface ParseOk<A> {
  readonly _tag: 'ParseOk';
  readonly value: A;
  readonly rest: string;
}

export interface ParseErr {
  readonly _tag: 'ParseErr';
  readonly expected: string;
  readonly found: string;
}

export type Parsed<A> = ParseOk<A> | ParseErr;

export type Parser<A> = (input: string) => Parsed<A>;

const parseOk = <A>(value: A, rest: string): Parsed<A> => ({ _tag: 'ParseOk', value, rest });

const parseErr = (expected: string, found: string): ParseErr => ({
  _tag: 'ParseErr',
  expected,
  found,
});

export const succeed =
  <A>(value: A): Parser<A> =>
  (input) =>
    parseOk(value, input);

export const fail =
  (expected: string): Parser<never> =>
  (input) =>
    parseErr(expected, input);

/** Match an exact prefix (case-sensitive), consuming it. */
export const literal =
  (prefix: string): Parser<string> =>
  (input) =>
    input.startsWith(prefix) ? parseOk(prefix, input.slice(prefix.length)) : parseErr(prefix, input);

/** Match an anchored regular expression, consuming the match. */
export const regex =
  (re: RegExp, label: string): Parser<string> =>
  (input) => {
    const anchored = re.source.startsWith('^') ? re : new RegExp(`^(?:${re.source})`, re.flags);
    const matched = anchored.exec(input)?.[0];
    return matched !== undefined
      ? parseOk(matched, input.slice(matched.length))
      : parseErr(label, input);
  };

/** Consume the entire remaining input. */
export const rest: Parser<string> = (input) => parseOk(input, '');

export const map =
  <A, B>(f: (a: A) => B) =>
  (p: Parser<A>): Parser<B> =>
  (input) => {
    const r = p(input);
    return r._tag === 'ParseOk' ? parseOk(f(r.value), r.rest) : r;
  };

/** Run `p`, then feed its value to a parser-producing function (monadic bind). */
export const flatMap =
  <A, B>(f: (a: A) => Parser<B>) =>
  (p: Parser<A>): Parser<B> =>
  (input) => {
    const r = p(input);
    return r._tag === 'ParseOk' ? f(r.value)(r.rest) : r;
  };

/** Sequence two parsers, keeping only the right-hand value. */
export const then =
  <B>(next: Parser<B>) =>
  <A>(p: Parser<A>): Parser<B> =>
  (input) => {
    const r = p(input);
    return r._tag === 'ParseOk' ? next(r.rest) : r;
  };

/** Try `p`; on failure fall back to `alternative` against the original input. */
export const orElse =
  <A>(alternative: Parser<A>) =>
  (p: Parser<A>): Parser<A> =>
  (input) => {
    const r = p(input);
    return r._tag === 'ParseOk' ? r : alternative(input);
  };

/** First successful parser wins. */
export const oneOf =
  <A>(parsers: ReadonlyArray<Parser<A>>): Parser<A> =>
  (input) => {
    let lastError: ParseErr = parseErr('one of several alternatives', input);
    for (const p of parsers) {
      const r = p(input);
      if (r._tag === 'ParseOk') {
        return r;
      }
      lastError = r;
    }
    return lastError;
  };

export const run = <A>(p: Parser<A>, input: string): Parsed<A> => p(input);
