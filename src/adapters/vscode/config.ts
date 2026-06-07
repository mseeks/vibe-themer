import * as vscode from 'vscode';
import { type AsyncResultType, err, type NonEmptyArray, ok } from '../../fp';
import { applyColor, applyTokenRule, type TextMateRule } from '../../domain/customizations';
import { type WriteTarget } from '../../domain/scope';
import {
  type ColorMap,
  type CurrentTheme,
  type ScopedTheme,
  type ThemeSetting,
  type TokenCustomizations,
} from '../../domain/theme';
import { type ConfigError, type ConfigStore } from '../../ports';

const COLOR_KEY = 'workbench.colorCustomizations';
const TOKEN_KEY = 'editor.tokenColorCustomizations';

interface TokenCustomizationsShape {
  readonly textMateRules?: ReadonlyArray<TextMateRule>;
  readonly [key: string]: unknown;
}

// VS Code config is user-editable JSON, so reads are validated, never trusted blindly.
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asColorMap = (value: unknown): ColorMap => (isPlainObject(value) ? (value as ColorMap) : {});

const asTokenShape = (value: unknown): TokenCustomizationsShape =>
  isPlainObject(value) ? (value as TokenCustomizationsShape) : {};

const targetOf = (target: WriteTarget): vscode.ConfigurationTarget =>
  target === 'global'
    ? vscode.ConfigurationTarget.Global
    : vscode.ConfigurationTarget.Workspace;

const scopedTheme = (colors: unknown, tokens: unknown): ScopedTheme => ({
  colors: asColorMap(colors),
  tokens: isPlainObject(tokens) ? (tokens as TokenCustomizations) : {},
});

const applyToTarget = async (
  setting: ThemeSetting,
  target: WriteTarget,
): AsyncResultType<ConfigError, void> => {
  try {
    const config = vscode.workspace.getConfiguration();
    const vsTarget = targetOf(target);

    if (setting._tag === 'SelectorSetting') {
      const existing = asColorMap(config.get<unknown>(COLOR_KEY));
      const next = applyColor(existing, setting.selector, setting.color);
      await config.update(COLOR_KEY, next, vsTarget);
    } else {
      const existing = asTokenShape(config.get<unknown>(TOKEN_KEY));
      const rules = Array.isArray(existing.textMateRules) ? existing.textMateRules : [];
      const nextRules = applyTokenRule(rules, setting.scope, setting.color, setting.fontStyle);
      await config.update(TOKEN_KEY, { ...existing, textMateRules: nextRules }, vsTarget);
    }
    return ok(undefined);
  } catch {
    return err({ _tag: 'WriteFailed', target });
  }
};

export const createConfigStore = (): ConfigStore => ({
  readCurrentTheme: (): CurrentTheme => {
    const config = vscode.workspace.getConfiguration();
    const colors = config.inspect<unknown>(COLOR_KEY);
    const tokens = config.inspect<unknown>(TOKEN_KEY);
    return {
      global: scopedTheme(colors?.globalValue, tokens?.globalValue),
      workspace: scopedTheme(colors?.workspaceValue, tokens?.workspaceValue),
    };
  },

  hasWorkspaceFolders: (): boolean => (vscode.workspace.workspaceFolders?.length ?? 0) > 0,

  applySetting: async (
    setting: ThemeSetting,
    preference: NonEmptyArray<WriteTarget>,
  ): AsyncResultType<ConfigError, WriteTarget> => {
    for (const target of preference) {
      const result = await applyToTarget(setting, target);
      if (result._tag === 'Ok') {
        return ok(target);
      }
    }
    return err({ _tag: 'AllTargetsFailed' });
  },

  reset: async (): AsyncResultType<ConfigError, void> => {
    const config = vscode.workspace.getConfiguration();
    // `allSettled` never rejects, so inspect the outcomes: surface failure only when
    // every target failed (a workspace-target failure with no folder open is normal).
    const outcomes = await Promise.allSettled([
      config.update(COLOR_KEY, undefined, vscode.ConfigurationTarget.Workspace),
      config.update(TOKEN_KEY, undefined, vscode.ConfigurationTarget.Workspace),
      config.update(COLOR_KEY, undefined, vscode.ConfigurationTarget.Global),
      config.update(TOKEN_KEY, undefined, vscode.ConfigurationTarget.Global),
    ]);
    return outcomes.every((o) => o.status === 'rejected')
      ? err({ _tag: 'AllTargetsFailed' })
      : ok(undefined);
  },
});
