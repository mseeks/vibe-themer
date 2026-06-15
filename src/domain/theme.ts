/**
 * The theme as a domain object: the individual `ThemeSetting`s we apply, and the
 * `CurrentTheme` snapshot we read back for iteration.
 *
 * `CurrentTheme` keeps the global and workspace scopes separate, which is what
 * fixes the v1 bug where both were read from the same merged config value and scope
 * detection became meaningless.
 */

import { matchTag, none, type OptionType, some } from '../fp';
import type { ColorValue } from './color';
import type { StreamingDirective } from './directive';
import type { FontStyle } from './fontStyle';
import type { ConfigurationScope } from './scope';
import type { WorkbenchSelector } from './selector';
import type { TokenScope } from './tokenScope';

/** An applicable theme change. `Count`/`Message` directives are not settings. */
export type ThemeSetting =
  | { readonly _tag: 'SelectorSetting'; readonly selector: WorkbenchSelector; readonly color: ColorValue }
  | {
      readonly _tag: 'TokenSetting';
      readonly scope: TokenScope;
      readonly color: ColorValue;
      readonly fontStyle: OptionType<FontStyle>;
    };

export const settingOf = (directive: StreamingDirective): OptionType<ThemeSetting> =>
  matchTag(directive, {
    Count: () => none,
    Message: () => none,
    Selector: ({ selector, color }): OptionType<ThemeSetting> =>
      some({ _tag: 'SelectorSetting', selector, color }),
    Token: ({ scope, color, fontStyle }): OptionType<ThemeSetting> =>
      some({ _tag: 'TokenSetting', scope, color, fontStyle }),
  });

export type ColorMap = Readonly<Record<string, string>>;
export type TokenCustomizations = Readonly<Record<string, unknown>>;

export interface ScopedTheme {
  readonly colors: ColorMap;
  readonly tokens: TokenCustomizations;
}

export interface CurrentTheme {
  readonly global: ScopedTheme;
  readonly workspace: ScopedTheme;
}

const isEmptyRecord = (record: Readonly<Record<string, unknown>>): boolean =>
  Object.keys(record).length === 0;

const scopeHasCustomizations = (scope: ScopedTheme): boolean =>
  !isEmptyRecord(scope.colors) || !isEmptyRecord(scope.tokens);

/** Workspace overrides global, matching VS Code's own precedence. */
export const effectiveColors = (theme: CurrentTheme): ColorMap => ({
  ...theme.global.colors,
  ...theme.workspace.colors,
});

export const effectiveTokens = (theme: CurrentTheme): TokenCustomizations => ({
  ...theme.global.tokens,
  ...theme.workspace.tokens,
});

export const hasCustomizations = (theme: CurrentTheme): boolean =>
  scopeHasCustomizations(theme.global) || scopeHasCustomizations(theme.workspace);

export const effectiveScope = (theme: CurrentTheme): ConfigurationScope => {
  const global = scopeHasCustomizations(theme.global);
  const workspace = scopeHasCustomizations(theme.workspace);
  if (global && workspace) {
    return { _tag: 'Both' };
  }
  if (workspace) {
    return { _tag: 'Workspace' };
  }
  if (global) {
    return { _tag: 'Global' };
  }
  return { _tag: 'None' };
};
