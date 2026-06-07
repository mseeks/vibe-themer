/**
 * `AsyncResult<E, A>` is just `Promise<Result<E, A>>` — an asynchronous, fallible
 * computation whose error is a value, not a rejection. `tryCatch` lifts a
 * promise-returning thunk into one, so the imperative shell can hand the core a
 * Result instead of a rejection.
 */

import * as Result from './result';

export type AsyncResult<E, A> = Promise<Result.Result<E, A>>;

/**
 * Lift a promise-returning thunk into an `AsyncResult`, mapping any failure to the
 * error channel. Handles both a rejected promise and a *synchronous* throw from the
 * thunk itself (the latter would otherwise escape `.then` and reject the result).
 */
export const tryCatch = <E, A>(
  thunk: () => Promise<A>,
  onThrow: (u: unknown) => E,
): AsyncResult<E, A> => {
  try {
    return thunk().then(
      (value) => Result.ok<A, E>(value),
      (u: unknown) => Result.err<E, A>(onThrow(u)),
    );
  } catch (u) {
    return Promise.resolve(Result.err<E, A>(onThrow(u)));
  }
};
