/**
 * Non-emptiness lifted into the type system. A `NonEmptyArray<A>` is known by the
 * compiler to have a first element, so `head` needs no runtime null check.
 */

import { Brand } from './brand';

export type NonEmptyArray<A> = readonly [A, ...A[]];

export const isNonEmptyArray = <A>(as: ReadonlyArray<A>): as is NonEmptyArray<A> => as.length > 0;

export const head = <A>(as: NonEmptyArray<A>): A => as[0];

export const tail = <A>(as: NonEmptyArray<A>): ReadonlyArray<A> => as.slice(1);

/** A `string` proven, by construction, to contain a non-whitespace character. */
export type NonEmptyString = Brand<string, 'NonEmptyString'>;

export const isNonEmptyString = (s: string): s is NonEmptyString => s.trim().length > 0;
