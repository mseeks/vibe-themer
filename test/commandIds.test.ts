import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMMAND_IDS } from '../src/commands';

interface Manifest {
  readonly contributes: { readonly commands: ReadonlyArray<{ readonly command: string }> };
}

describe('command IDs ↔ manifest (guards the v1 testRemoveValue/testRemoveValues drift)', () => {
  it('the registry and package.json contribute exactly the same command ids', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as Manifest;
    const manifestIds = pkg.contributes.commands.map((c) => c.command).sort();
    const registryIds = [...Object.values(COMMAND_IDS)].sort();
    assert.deepEqual(registryIds, manifestIds);
  });
});
