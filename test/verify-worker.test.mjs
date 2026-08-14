import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { verifyWorker } from '../scripts/verify-worker.mjs';

const validSource = "export default { fetch() { return new Response('ok') } };\n";
const validOutput = `${validSource}${'// padding\n'.repeat(120)}`;

async function fixture(source = validSource, output = validOutput) {
  const directory = await mkdtemp(join(tmpdir(), 'cfnew-verify-'));
  const sourcePath = join(directory, 'source.js');
  const outputPath = join(directory, 'output.js');
  await writeFile(sourcePath, source);
  await writeFile(outputPath, output);
  return { sourcePath, outputPath };
}

test('rejects a missing source file before deployment', async () => {
  const { outputPath } = await fixture();
  await assert.rejects(
    verifyWorker({ sourcePath: `${outputPath}.missing`, outputPath }),
    /source file/i,
  );
});

test('rejects an empty source file before deployment', async () => {
  const paths = await fixture('', validOutput);
  await assert.rejects(verifyWorker(paths), /source file is empty/i);
});

test('rejects an unchanged output artifact', async () => {
  const paths = await fixture(validSource, validSource);
  await assert.rejects(
    verifyWorker({ ...paths, minimumBytes: 1 }),
    /differ from source/i,
  );
});

test('rejects an undersized output artifact', async () => {
  const paths = await fixture(validSource, `${validSource}// changed\n`);
  await assert.rejects(
    verifyWorker({ ...paths, minimumBytes: 10_000 }),
    /smaller than/i,
  );
});

test('rejects syntactically invalid JavaScript output', async () => {
  const paths = await fixture(validSource, `${'// padding\n'.repeat(120)}export default {`);
  await assert.rejects(verifyWorker(paths), /syntax check failed/i);
});

test('returns safe metadata for a valid generated Worker', async () => {
  const paths = await fixture();
  const result = await verifyWorker(paths);

  assert.equal(result.sourceBytes, Buffer.byteLength(validSource));
  assert.equal(result.outputBytes, Buffer.byteLength(validOutput));
  assert.match(result.sourceHash, /^[a-f0-9]{64}$/);
  assert.match(result.outputHash, /^[a-f0-9]{64}$/);
  assert.notEqual(result.sourceHash, result.outputHash);
});
