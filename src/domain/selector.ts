/**
 * `WorkbenchSelector` — a `workbench.colorCustomizations` key such as
 * `editor.background`. VS Code's catalogue is large and evolves, so rather than
 * enumerate it we accept any dotted identifier and reject obvious garbage. The
 * brand guarantees callers can't pass a raw, unvalidated string.
 */

import { type Brand, Result, type ResultType } from '../fp';
import { empty, malformed, type ValidationError } from './errors';

export type WorkbenchSelector = Brand<string, 'WorkbenchSelector'>;

// A letter, then letters/digits in dot-separated segments: `editorGroup.dropBackground`,
// `editorIndentGuide.activeBackground6`, `editorBracketHighlight.foreground1`.
const SELECTOR_RE = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)*$/;

export const parseSelector = (raw: string): ResultType<ValidationError, WorkbenchSelector> => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return Result.err(empty('selector'));
  }
  if (!SELECTOR_RE.test(trimmed)) {
    return Result.err(malformed('selector', 'a dotted identifier like editor.background', trimmed));
  }
  return Result.ok(trimmed as WorkbenchSelector);
};

export const selectorText = (s: WorkbenchSelector): string => s;
