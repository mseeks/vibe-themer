/**
 * `AsyncResult<E, A>` is just `Promise<Result<E, A>>` — an asynchronous, fallible
 * computation whose error is a value, not a rejection. The combinators let the
 * application layer sequence effects without `try/catch`, keeping the happy path
 * linear and the error type honest.
 */

import * as Result from './result';

export type AsyncResult<E, A> = Promise<Result.Result<E, A>>;

export const ok = <A = never, E = never>(value: A): AsyncResult<E, A> =>
  Promise.resolve(Result.ok(value));

export const err = <E = never, A = never>(error: E): AsyncResult<E, A> =>
  Promise.resolve(Result.err(error));

export const fromResult = <E, A>(r: Result.Result<E, A>): AsyncResult<E, A> => Promise.resolve(r);

export const map =
  <A, B>(f: (a: A) => B) =>
  <E>(ar: AsyncResult<E, A>): AsyncResult<E, B> =>
    ar.then(Result.map(f));

export const mapErr =
  <E, F>(f: (e: E) => F) =>
  <A>(ar: AsyncResult<E, A>): AsyncResult<F, A> =>
    ar.then(Result.mapErr(f));

export const flatMap =
  <A, E2, B>(f: (a: A) => AsyncResult<E2, B>) =>
  <E>(ar: AsyncResult<E, A>): AsyncResult<E | E2, B> =>
    ar.then((r): AsyncResult<E | E2, B> => (r._tag === 'Ok' ? f(r.value) : Promise.resolve(r)));

export const match =
  <E, A, R>(handlers: { readonly onErr: (e: E) => R; readonly onOk: (a: A) => R }) =>
  (ar: AsyncResult<E, A>): Promise<R> =>
    ar.then(Result.match(handlers));

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
