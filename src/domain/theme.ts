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

// ── Parsing user-editable config ────────────────────────────────────────────────
// VS Code config is hand-editable JSON, so a read is *parsed* into a known-good domain
// value here rather than trusted and cast at the adapter. Corrupt input degrades to
// empty; nothing throws and no malformed value slips through to the apply path.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Parse a `workbench.colorCustomizations` value. Keeps color entries (strings) and VS
 * Code's per-theme override blocks (`"[Theme]": {…}`, objects) so a round-trip write
 * never drops them, and rejects corrupt scalars (a number, boolean, or array) that
 * could never be a valid customization.
 */
export const parseColorMap = (value: unknown): ColorMap => {
  if (!isRecord(value)) {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' || isRecord(entry)) {
      out[key] = entry;
    }
  }
  return out as ColorMap;
};

/**
 * Parse an `editor.tokenColorCustomizations` value. Its entries are opaque to us
 * (textMateRules, semanticTokenColors, …), so a well-formed object is kept whole and
 * anything else degrades to empty.
 */
export const parseTokenCustomizations = (value: unknown): TokenCustomizations =>
  isRecord(value) ? value : {};

/** Read one scope's raw config values into a typed `ScopedTheme`. */
export const parseScopedTheme = (colors: unknown, tokens: unknown): ScopedTheme => ({
  colors: parseColorMap(colors),
  tokens: parseTokenCustomizations(tokens),
});

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
