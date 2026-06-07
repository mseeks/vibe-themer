// Bundles the test entry (and its imports) into a single CJS file so the suite
// runs in one process on Node's built-in `node:test` — no test-runner dependency
// and no worker pool (which is unreliable in some sandboxes). Run: `npm test`.
const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['test/run.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: 'out/test.cjs',
    sourcemap: 'inline',
    logLevel: 'info',
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
