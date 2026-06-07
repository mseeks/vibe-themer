/**
 * Pure merge logic for VS Code customizations — extracted from the config adapter
 * so the fiddly parts (incremental color set/delete, token-rule replace/remove by
 * scope, including array-valued scopes) are unit-testable without the editor host.
 * The adapter is left as a thin read → merge → write.
 */

import { type OptionType } from '../fp';
import { type ColorValue, toApplication } from './color';
import { type FontStyle, fontStyleText } from './fontStyle';
import { type WorkbenchSelector, selectorText } from './selector';
import { type ColorMap } from './theme';
import { type TokenScope, tokenScopeText } from './tokenScope';

/** VS Code's `editor.tokenColorCustomizations.textMateRules` entry shape. */
export interface TextMateRule {
  readonly scope?: string | ReadonlyArray<string>;
  readonly settings?: Record<string, unknown>;
}

const scopeMatches = (ruleScope: TextMateRule['scope'], scope: string): boolean =>
  Array.isArray(ruleScope) ? ruleScope.includes(scope) : ruleScope === scope;

/** Set or delete one selector in a color map, returning a new map. */
export const applyColor = (
  existing: ColorMap,
  selector: WorkbenchSelector,
  color: ColorValue,
): ColorMap => {
  const key = selectorText(selector);
  const application = toApplication(color);
  if (application._tag === 'Delete') {
    const next: Record<string, string> = { ...existing };
    delete next[key];
    return next;
  }
  return { ...existing, [key]: application.value };
};

/** Replace, add, or remove the rule(s) for a scope, returning a new rule list. */
export const applyTokenRule = (
  rules: ReadonlyArray<TextMateRule>,
  scope: TokenScope,
  color: ColorValue,
  fontStyle: OptionType<FontStyle>,
): ReadonlyArray<TextMateRule> => {
  const scopeText = tokenScopeText(scope);
  const withoutScope = rules.filter((rule) => !scopeMatches(rule.scope, scopeText));
  const application = toApplication(color);
  if (application._tag === 'Delete') {
    return withoutScope;
  }
  return [
    ...withoutScope,
    {
      scope: scopeText,
      settings: {
        foreground: application.value,
        ...(fontStyle._tag === 'Some' ? { fontStyle: fontStyleText(fontStyle.value) } : {}),
      },
    },
  ];
};
