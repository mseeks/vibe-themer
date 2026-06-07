/**
 * Builds the user-prompt sent to the model. When the editor already carries theme
 * customizations, their effective values are summarized first so the model can
 * iterate ("make it warmer") instead of starting over. The format matches v1's
 * `formatCurrentThemeContext`, but the data is now sourced correctly per scope.
 */

import { none, type NonEmptyString, type OptionType, some } from '../fp';
import {
  type CurrentTheme,
  effectiveColors,
  effectiveTokens,
  hasCustomizations,
} from '../domain/theme';
import { type Vibe, vibeText } from '../domain/vibe';

const formatContext = (current: CurrentTheme): OptionType<string> => {
  if (!hasCustomizations(current)) {
    return none;
  }

  const lines: string[] = [];

  const colors = effectiveColors(current);
  const colorEntries = Object.entries(colors);
  if (colorEntries.length > 0) {
    lines.push('CURRENT THEME CONTEXT:');
    lines.push(`Active workbench color overrides (${colorEntries.length} settings):`);
    for (const [key, value] of colorEntries) {
      lines.push(`- ${key}: ${value}`);
    }
  }

  const tokens = effectiveTokens(current);
  const tokenEntries = Object.entries(tokens);
  if (tokenEntries.length > 0) {
    if (lines.length > 0) {
      lines.push('');
    }
    lines.push(`Active syntax highlighting overrides (${tokenEntries.length} settings):`);
    for (const [key, value] of tokenEntries) {
      lines.push(`- ${key}: ${JSON.stringify(value)}`);
    }
  }

  if (lines.length === 0) {
    return none;
  }
  lines.push('');
  lines.push('User request:');
  return some(lines.join('\n'));
};

export const buildUserPrompt = (current: CurrentTheme, vibe: Vibe): NonEmptyString => {
  const context = formatContext(current);
  // `vibe` is non-empty by construction, so either branch yields a non-empty string.
  const body =
    context._tag === 'Some'
      ? `${context.value}\n${vibeText(vibe)}`
      : `Theme description: ${vibeText(vibe)}`;
  return body as NonEmptyString;
};
