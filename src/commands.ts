/**
 * The command registry: the single source of truth for command IDs and their
 * handlers. Centralizing the IDs here (rather than re-typing string literals in
 * `extension.ts` and `package.json`) is what makes the v1 `testRemoveValue` vs
 * `testRemoveValues` drift impossible — and a test asserts these match the manifest.
 */

import { generateTheme, renderGenerationError } from './application/generateTheme';
import { clearApiKey, resetModel, resetTheme, selectModel } from './application/maintenance';
import { type Capabilities } from './ports';

export const COMMAND_IDS = {
  changeTheme: 'vibeThemer.changeTheme',
  resetTheme: 'vibeThemer.resetTheme',
  clearApiKey: 'vibeThemer.clearApiKey',
  selectModel: 'vibeThemer.selectModel',
  resetModel: 'vibeThemer.resetModel',
} as const;

export type CommandId = (typeof COMMAND_IDS)[keyof typeof COMMAND_IDS];

const runChangeTheme = async (caps: Capabilities): Promise<void> => {
  const result = await generateTheme(caps);
  // Only genuine failures surface a notification. Benign exits — a dismissed vibe
  // picker (NoVibe) or key prompt (NoKey), and completed/cancelled runs that already
  // showed their own modal — exit silently rather than nagging the user.
  if (result._tag === 'Err') {
    const message = renderGenerationError(result.error);
    if (message._tag === 'Some') {
      await caps.ui.notify(message.value, 'error');
    }
  }
};

export const commandHandlers = (
  caps: Capabilities,
): Readonly<Record<CommandId, () => Promise<void>>> => ({
  [COMMAND_IDS.changeTheme]: () => runChangeTheme(caps),
  [COMMAND_IDS.resetTheme]: () => resetTheme(caps),
  [COMMAND_IDS.clearApiKey]: () => clearApiKey(caps),
  [COMMAND_IDS.selectModel]: () => selectModel(caps),
  [COMMAND_IDS.resetModel]: () => resetModel(caps),
});
