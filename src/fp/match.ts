/**
 * Exhaustive pattern matching over discriminated unions keyed by a `_tag` field.
 *
 * `matchTag(value, handlers)` requires one handler per variant: omit a case and
 * the object literal fails to type-check. This is how control flow over a union
 * is made total at compile time, with no `default` branch to silently swallow a
 * new variant added later.
 */

export interface HasTag<T extends string = string> {
  readonly _tag: T;
}

export const matchTag = <T extends HasTag, R>(
  value: T,
  handlers: { readonly [K in T['_tag']]: (variant: Extract<T, { _tag: K }>) => R },
): R => handlers[value._tag as T['_tag']](value as Extract<T, { _tag: T['_tag'] }>);

/**
 * Compile-time proof that a point is unreachable. Pass a value the type system
 * believes to be `never`; if a real variant ever reaches here the build breaks.
 */
export const assertNever = (value: never): never => {
  const tag =
    typeof value === 'object' && value !== null && '_tag' in value
      ? String((value as HasTag)._tag)
      : String(value);
  throw new Error(`Unreachable variant reached: ${tag}`);
};
