import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('deploys only the generated Worker with the approved runtime date', async () => {
  const config = JSON.parse(await readFile('wrangler.json', 'utf8'));

  assert.equal(config.name, 'cfnew');
  assert.equal(config.main, 'dist/worker.js');
  assert.equal(config.compatibility_date, '2026-01-20');
  assert.equal(config.keep_vars, true);
  assert.equal(config.build, undefined);
});

test('does not commit credentials or runtime secret values in Wrangler config', async () => {
  const config = JSON.parse(await readFile('wrangler.json', 'utf8'));
  const serialized = JSON.stringify(config).toLowerCase();

  assert.doesNotMatch(serialized, /api[_-]?token|password|uuid|secret/);
  assert.equal(config.vars, undefined);
});
