/**
 * `TokenScope` — a TextMate scope for syntax highlighting, e.g. `comment` or
 * `comment.line.double-slash`. Dots and hyphens are allowed; whitespace and the
 * `=` delimiter are not (they would break the streaming protocol).
 */

import { type Brand, Result, type ResultType } from '../fp';
import { empty, malformed, type ValidationError } from './errors';

export type TokenScope = Brand<string, 'TokenScope'>;

const SCOPE_RE = /^[A-Za-z][A-Za-z0-9.-]*$/;

export const parseTokenScope = (raw: string): ResultType<ValidationError, TokenScope> => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return Result.err(empty('token scope'));
  }
  if (!SCOPE_RE.test(trimmed)) {
    return Result.err(malformed('token scope', 'a TextMate scope like comment.line', trimmed));
  }
  return Result.ok(trimmed as TokenScope);
};

export const tokenScopeText = (s: TokenScope): string => s;
