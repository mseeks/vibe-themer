/**
 * `Redacted<A>` wraps a secret so it cannot be read by accident. The wrapped value
 * lives behind a module-private symbol, and `toString`/`toJSON` both yield a
 * placeholder. So a secret can be threaded through logs, error objects, and
 * `JSON.stringify` without ever leaking — the value comes out only via the explicit
 * `expose`, which is easy to grep for and audit.
 *
 * This makes the v1 bug (the API key reaching `console.error` via the client state)
 * unrepresentable: a `Redacted<ApiKey>` printed anywhere renders as `<redacted>`.
 */

const secret = Symbol('redacted');

export interface Redacted<A> {
  readonly [secret]: A;
  toString(): string;
  toJSON(): string;
}

export const redact = <A>(value: A): Redacted<A> => ({
  [secret]: value,
  toString: () => '<redacted>',
  toJSON: () => '<redacted>',
});

/** The single, auditable escape hatch. Use only at the boundary that needs the raw value. */
export const expose = <A>(r: Redacted<A>): A => r[secret];
