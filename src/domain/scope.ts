/**
 * Where theme customizations live. `ConfigurationScope` describes *where existing*
 * customizations were found; `writePreference` describes where new ones go.
 *
 * The write preference is an ordered, non-empty list: try the first target, fall
 * back to the next only if it fails. With a workspace open we prefer `global` (the
 * theme follows the user everywhere) and keep `workspace` as a fallback — preserving
 * v1's first-success-wins behavior, but named honestly instead of the old "both".
 */

import { matchTag, type NonEmptyArray } from '../fp';

export type WriteTarget = 'global' | 'workspace';

export type ConfigurationScope =
  | { readonly _tag: 'Global' }
  | { readonly _tag: 'Workspace' }
  | { readonly _tag: 'Both' }
  | { readonly _tag: 'None' };

export const writePreference = (hasWorkspaceFolders: boolean): NonEmptyArray<WriteTarget> =>
  hasWorkspaceFolders ? ['global', 'workspace'] : ['global'];

export const describeTarget = (target: WriteTarget): string =>
  target === 'global' ? 'global settings' : 'workspace settings';

export const describeScope = (scope: ConfigurationScope): string =>
  matchTag(scope, {
    Global: () => 'global settings',
    Workspace: () => 'workspace settings',
    Both: () => 'global and workspace settings',
    None: () => 'no settings',
  });
