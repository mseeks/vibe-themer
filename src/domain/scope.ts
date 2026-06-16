/**
 * Where theme customizations live. `ConfigurationScope` describes *where existing*
 * customizations were found; `writePreference` describes where new ones go.
 *
 * The write preference is an ordered, non-empty list: try the first target, fall
 * back to the next only if it fails (first-success-wins). The user's `applyTo`
 * setting picks which target to try first; `workspace` is only meaningful with a
 * folder open, so without one we always fall through to `global`.
 */

import { none, type NonEmptyArray, type OptionType, some } from '../fp';

export type WriteTarget = 'global' | 'workspace';

const WRITE_TARGETS: ReadonlyArray<WriteTarget> = ['global', 'workspace'];

/**
 * Parse the user's `vibeThemer.applyTo` value. The package.json enum only constrains
 * the Settings UI dropdown, so a hand-edited settings.json can still hold a typo;
 * this returns `None` for an absent or invalid value so the adapter can default and
 * log explicitly rather than silently treating "globel" as "global".
 */
export const parseWriteTarget = (raw: string | undefined): OptionType<WriteTarget> =>
  raw !== undefined && (WRITE_TARGETS as ReadonlyArray<string>).includes(raw)
    ? some(raw as WriteTarget)
    : none;

export type ConfigurationScope =
  | { readonly _tag: 'Global' }
  | { readonly _tag: 'Workspace' }
  | { readonly _tag: 'Both' }
  | { readonly _tag: 'None' };

export const writePreference = (
  preferred: WriteTarget,
  hasWorkspaceFolders: boolean,
): NonEmptyArray<WriteTarget> => {
  if (preferred === 'workspace') {
    return hasWorkspaceFolders ? ['workspace', 'global'] : ['global'];
  }
  return hasWorkspaceFolders ? ['global', 'workspace'] : ['global'];
};
