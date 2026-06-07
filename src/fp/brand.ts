/**
 * Nominal typing via branding. A `Brand<A, "Name">` is structurally an `A` but
 * the compiler refuses to accept a bare `A` where the brand is required. The only
 * way to obtain one is through a smart constructor in the domain, so possession of
 * a branded value is itself proof that it satisfies the business rule.
 */

declare const brand: unique symbol;

export type Brand<A, B extends string> = A & { readonly [brand]: B };

/** Convenience for the common case of a branded `string`. */
export type Tagged<B extends string> = Brand<string, B>;
