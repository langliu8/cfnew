import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildWorker } from '../scripts/build-worker.mjs';
import { verifyWorker } from '../scripts/verify-worker.mjs';

const source = `
const greeting = 'hello from the worker';
const padding = '${"x".repeat(1400)}';
export default {
  fetch() {
    return new Response(greeting + padding.slice(0, 0));
  }
};
`;

test('obfuscates a real module Worker into a verified artifact', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cfnew-build-'));
  const sourcePath = join(directory, 'source.js');
  const outputPath = join(directory, 'dist', 'worker.js');
  await writeFile(sourcePath, source);

  const metadata = await buildWorker({ sourcePath, outputPath });
  const output = await readFile(outputPath, 'utf8');
  const verified = await verifyWorker({ sourcePath, outputPath, minimumBytes: 1 });

  assert.notEqual(output, source);
  assert.doesNotMatch(output, /sourceMappingURL/);
  assert.equal(metadata.outputHash, verified.outputHash);
  assert.notEqual(metadata.sourceHash, metadata.outputHash);
});

test('does not create an artifact when the source is missing', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cfnew-build-'));
  const sourcePath = join(directory, 'missing.js');
  const outputPath = join(directory, 'dist', 'worker.js');

  await assert.rejects(buildWorker({ sourcePath, outputPath }), /source file/i);
  await assert.rejects(access(outputPath));
});
