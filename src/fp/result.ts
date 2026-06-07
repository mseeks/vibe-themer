/**
 * `Result<E, A>` — a computation that either fails with an `E` or succeeds with an
 * `A`. Errors are ordinary values, so the pure core never throws and every failure
 * is visible in a function's type. Import as a namespace: `import * as Result`.
 */

export interface Err<E> {
  readonly _tag: 'Err';
  readonly error: E;
}

export interface Ok<A> {
  readonly _tag: 'Ok';
  readonly value: A;
}

export type Result<E, A> = Err<E> | Ok<A>;

export const err = <E = never, A = never>(error: E): Result<E, A> => ({ _tag: 'Err', error });

export const ok = <A = never, E = never>(value: A): Result<E, A> => ({ _tag: 'Ok', value });

export const isOk = <E, A>(r: Result<E, A>): r is Ok<A> => r._tag === 'Ok';

export const isErr = <E, A>(r: Result<E, A>): r is Err<E> => r._tag === 'Err';

/** Transform the success channel; an error passes through untouched. */
export const map =
  <A, B>(f: (a: A) => B) =>
  <E>(r: Result<E, A>): Result<E, B> =>
    r._tag === 'Ok' ? ok(f(r.value)) : r;

/** Transform the error channel; a success passes through untouched. */
export const mapErr =
  <E, F>(f: (e: E) => F) =>
  <A>(r: Result<E, A>): Result<F, A> =>
    r._tag === 'Err' ? err(f(r.error)) : r;

/** Monadic bind: sequence a second fallible step. Error types accumulate as a union. */
export const flatMap =
  <A, E2, B>(f: (a: A) => Result<E2, B>) =>
  <E>(r: Result<E, A>): Result<E | E2, B> =>
    r._tag === 'Ok' ? f(r.value) : r;

/** Collapse both channels to a single value — the only way out of a `Result`. */
export const match =
  <E, A, R>(handlers: { readonly onErr: (e: E) => R; readonly onOk: (a: A) => R }) =>
  (r: Result<E, A>): R =>
    r._tag === 'Ok' ? handlers.onOk(r.value) : handlers.onErr(r.error);

export const getOrElse =
  <E, A>(onErr: (e: E) => A) =>
  (r: Result<E, A>): A =>
    r._tag === 'Ok' ? r.value : onErr(r.error);

export const fromNullable =
  <E>(onNull: () => E) =>
  <A>(a: A | null | undefined): Result<E, NonNullable<A>> =>
    a == null ? err(onNull()) : ok(a as NonNullable<A>);

/** Lift a throwing thunk into a `Result`, mapping the thrown value. */
export const tryCatch = <E, A>(thunk: () => A, onThrow: (u: unknown) => E): Result<E, A> => {
  try {
    return ok(thunk());
  } catch (u) {
    return err(onThrow(u));
  }
};

/** Sequence an array of results, failing fast on the first error. */
export const all = <E, A>(results: ReadonlyArray<Result<E, A>>): Result<E, ReadonlyArray<A>> => {
  const values: A[] = [];
  for (const r of results) {
    if (r._tag === 'Err') {
      return r;
    }
    values.push(r.value);
  }
  return ok(values);
};
