/**
 * Single test entry. esbuild bundles this and its imports into one CJS file
 * (`out/test.cjs`); running it executes every suite in one process on Node's
 * built-in `node:test`. No test-runner dependency, no worker pool.
 */

import './redacted.test';
import './parser.test';
import './domain.test';
import './customizations.test';
import './progress.test';
import './theme.test';
import './context.test';
import './commandIds.test';
import './commands.test';
import './maintenance.test';
import './adapters.test';
import './generateTheme.test';
