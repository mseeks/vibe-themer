/**
 * Where theme customizations live. `ConfigurationScope` describes *where existing*
 * customizations were found; `writePreference` describes where new ones go.
 *
 * The write preference is an ordered, non-empty list: try the first target, fall
 * back to the next only if it fails (first-success-wins). The user's `applyTo`
 * setting picks which target to try first; `workspace` is only meaningful with a
 * folder open, so without one we always fall through to `global`.
 */

import { matchTag, type NonEmptyArray } from '../fp';

export type WriteTarget = 'global' | 'workspace';

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

export const describeTarget = (target: WriteTarget): string =>
  target === 'global' ? 'global settings' : 'workspace settings';

export const describeScope = (scope: ConfigurationScope): string =>
  matchTag(scope, {
    Global: () => 'global settings',
    Workspace: () => 'workspace settings',
    Both: () => 'global and workspace settings',
    None: () => 'no settings',
  });
