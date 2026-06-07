/**
 * The functional prelude. One import surface for the whole core:
 *
 *   import { pipe, Result, Option, matchTag } from '../fp';
 *
 * Effect-laden types (`Result`, `Option`, `AsyncResult`, `Parser`) are exposed as
 * namespaces so their identically-named combinators (`map`, `flatMap`, `match`)
 * never collide.
 */

export { pipe } from './function';
export { matchTag, type HasTag } from './match';
export { type Brand, type Tagged } from './brand';
export { redact, expose, type Redacted } from './redacted';
export {
  type NonEmptyArray,
  type NonEmptyString,
  isNonEmptyArray,
  isNonEmptyString,
  head,
  tail,
} from './nonEmpty';

// Bare constructors are exposed for ergonomics (no name collisions); the
// combinators that *do* collide (`map`, `flatMap`, `match`) stay namespaced.
export { ok, err, isOk, isErr } from './result';
export { some, none, isSome, isNone } from './option';

export * as Result from './result';
export * as Option from './option';
export * as AsyncResult from './asyncResult';
export * as P from './parser';

export type { Result as ResultType } from './result';
export type { Option as OptionType } from './option';
export type { AsyncResult as AsyncResultType } from './asyncResult';
