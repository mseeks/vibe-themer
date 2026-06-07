/**
 * `Option<A>` — a value that may be absent, made explicit in the type so the
 * compiler forces the empty case to be handled. Import as a namespace:
 * `import * as Option`.
 */

export interface None {
  readonly _tag: 'None';
}

export interface Some<A> {
  readonly _tag: 'Some';
  readonly value: A;
}

export type Option<A> = None | Some<A>;

export const none: Option<never> = { _tag: 'None' };

export const some = <A>(value: A): Option<A> => ({ _tag: 'Some', value });

export const isSome = <A>(o: Option<A>): o is Some<A> => o._tag === 'Some';

export const isNone = <A>(o: Option<A>): o is None => o._tag === 'None';

export const fromNullable = <A>(a: A | null | undefined): Option<NonNullable<A>> =>
  a == null ? none : some(a as NonNullable<A>);

export const map =
  <A, B>(f: (a: A) => B) =>
  (o: Option<A>): Option<B> =>
    o._tag === 'Some' ? some(f(o.value)) : o;

export const flatMap =
  <A, B>(f: (a: A) => Option<B>) =>
  (o: Option<A>): Option<B> =>
    o._tag === 'Some' ? f(o.value) : o;

export const filter =
  <A>(predicate: (a: A) => boolean) =>
  (o: Option<A>): Option<A> =>
    o._tag === 'Some' && predicate(o.value) ? o : none;

export const getOrElse =
  <A>(onNone: () => A) =>
  (o: Option<A>): A =>
    o._tag === 'Some' ? o.value : onNone();

export const match =
  <A, R>(handlers: { readonly onNone: () => R; readonly onSome: (a: A) => R }) =>
  (o: Option<A>): R =>
    o._tag === 'Some' ? handlers.onSome(o.value) : handlers.onNone();

/** Drop the `Option`, substituting a fallback. The inverse of `fromNullable`. */
export const toUndefined = <A>(o: Option<A>): A | undefined =>
  o._tag === 'Some' ? o.value : undefined;
