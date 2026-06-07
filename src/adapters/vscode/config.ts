import * as vscode from 'vscode';
import { type AsyncResultType, err, type NonEmptyArray, ok } from '../../fp';
import { toApplication } from '../../domain/color';
import { fontStyleText } from '../../domain/fontStyle';
import { type WriteTarget } from '../../domain/scope';
import { selectorText } from '../../domain/selector';
import {
  type ColorMap,
  type CurrentTheme,
  type ScopedTheme,
  type ThemeSetting,
  type TokenCustomizations,
} from '../../domain/theme';
import { tokenScopeText } from '../../domain/tokenScope';
import { type ConfigError, type ConfigStore } from '../../ports';

const COLOR_KEY = 'workbench.colorCustomizations';
const TOKEN_KEY = 'editor.tokenColorCustomizations';

interface TextMateRule {
  readonly scope?: string | ReadonlyArray<string>;
  readonly settings?: Record<string, unknown>;
}

interface TokenCustomizationsShape {
  readonly textMateRules?: ReadonlyArray<TextMateRule>;
  readonly [key: string]: unknown;
}

const targetOf = (target: WriteTarget): vscode.ConfigurationTarget =>
  target === 'global'
    ? vscode.ConfigurationTarget.Global
    : vscode.ConfigurationTarget.Workspace;

const scopedTheme = (
  colors: ColorMap | undefined,
  tokens: TokenCustomizations | undefined,
): ScopedTheme => ({ colors: colors ?? {}, tokens: tokens ?? {} });

const applyToTarget = async (
  setting: ThemeSetting,
  target: WriteTarget,
): AsyncResultType<ConfigError, void> => {
  try {
    const config = vscode.workspace.getConfiguration();
    const vsTarget = targetOf(target);

    if (setting._tag === 'SelectorSetting') {
      const existing: Record<string, string> = { ...(config.get<ColorMap>(COLOR_KEY) ?? {}) };
      const application = toApplication(setting.color);
      const key = selectorText(setting.selector);
      if (application._tag === 'Delete') {
        delete existing[key];
      } else {
        existing[key] = application.value;
      }
      await config.update(COLOR_KEY, existing, vsTarget);
    } else {
      const existing = config.get<TokenCustomizationsShape>(TOKEN_KEY) ?? {};
      const rules: ReadonlyArray<TextMateRule> = existing.textMateRules ?? [];
      const scope = tokenScopeText(setting.scope);
      const withoutScope = rules.filter((rule) => rule.scope !== scope);
      const application = toApplication(setting.color);
      const nextRules: ReadonlyArray<TextMateRule> =
        application._tag === 'Delete'
          ? withoutScope
          : [
              ...withoutScope,
              {
                scope,
                settings: {
                  foreground: application.value,
                  ...(setting.fontStyle._tag === 'Some'
                    ? { fontStyle: fontStyleText(setting.fontStyle.value) }
                    : {}),
                },
              },
            ];
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
    const colors = config.inspect<ColorMap>(COLOR_KEY);
    const tokens = config.inspect<TokenCustomizations>(TOKEN_KEY);
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
    try {
      const config = vscode.workspace.getConfiguration();
      await Promise.allSettled([
        config.update(COLOR_KEY, undefined, vscode.ConfigurationTarget.Workspace),
        config.update(TOKEN_KEY, undefined, vscode.ConfigurationTarget.Workspace),
        config.update(COLOR_KEY, undefined, vscode.ConfigurationTarget.Global),
        config.update(TOKEN_KEY, undefined, vscode.ConfigurationTarget.Global),
      ]);
      return ok(undefined);
    } catch {
      return err({ _tag: 'AllTargetsFailed' });
    }
  },
});
