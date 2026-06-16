import * as vscode from 'vscode';
import { type AsyncResultType, err, type NonEmptyArray, ok } from '../../fp';
import { applyColor, applyTokenRule, textMateRulesOf } from '../../domain/customizations';
import { type WriteTarget } from '../../domain/scope';
import {
  type CurrentTheme,
  parseColorMap,
  parseScopedTheme,
  parseTokenCustomizations,
  type ThemeSetting,
} from '../../domain/theme';
import { type ConfigError, type ConfigStore } from '../../ports';

const COLOR_KEY = 'workbench.colorCustomizations';
const TOKEN_KEY = 'editor.tokenColorCustomizations';

const targetOf = (target: WriteTarget): vscode.ConfigurationTarget =>
  target === 'global'
    ? vscode.ConfigurationTarget.Global
    : vscode.ConfigurationTarget.Workspace;

const applyToTarget = async (
  setting: ThemeSetting,
  target: WriteTarget,
): AsyncResultType<ConfigError, void> => {
  try {
    const config = vscode.workspace.getConfiguration();
    const vsTarget = targetOf(target);

    if (setting._tag === 'SelectorSetting') {
      const existing = parseColorMap(config.get<unknown>(COLOR_KEY));
      const next = applyColor(existing, setting.selector, setting.color);
      await config.update(COLOR_KEY, next, vsTarget);
    } else {
      const existing = parseTokenCustomizations(config.get<unknown>(TOKEN_KEY));
      const nextRules = applyTokenRule(
        textMateRulesOf(existing),
        setting.scope,
        setting.color,
        setting.fontStyle,
      );
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
      global: parseScopedTheme(colors?.globalValue, tokens?.globalValue),
      workspace: parseScopedTheme(colors?.workspaceValue, tokens?.workspaceValue),
    };
  },

  hasWorkspaceFolders: (): boolean => (vscode.workspace.workspaceFolders?.length ?? 0) > 0,

  applyTo: (): WriteTarget =>
    vscode.workspace.getConfiguration('vibeThemer').get<string>('applyTo') === 'workspace'
      ? 'workspace'
      : 'global',

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
