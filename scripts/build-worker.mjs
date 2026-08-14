import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import JavaScriptObfuscator from 'javascript-obfuscator';

import { verifyWorker } from './verify-worker.mjs';

const obfuscationOptions = Object.freeze({
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.35,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  seed: 1337,
  selfDefending: false,
  simplify: true,
  sourceMap: false,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayThreshold: 0.75,
  target: 'browser-no-eval',
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
});

export async function buildWorker({ sourcePath, outputPath }) {
  let source;
  try {
    source = await readFile(sourcePath, 'utf8');
  } catch (error) {
    throw new Error(`source file is missing: ${sourcePath}`, { cause: error });
  }
  if (source.trim().length === 0) {
    throw new Error(`source file is empty: ${sourcePath}`);
  }

  const output = JavaScriptObfuscator.obfuscate(
    source,
    obfuscationOptions,
  ).getObfuscatedCode();

  const outputDirectory = dirname(outputPath);
  const temporaryPath = `${outputPath}.tmp`;
  await mkdir(outputDirectory, { recursive: true });
  try {
    await writeFile(temporaryPath, `${output}\n`, 'utf8');
    const metadata = await verifyWorker({
      sourcePath,
      outputPath: temporaryPath,
      minimumBytes: Math.max(1024, Math.floor(Buffer.byteLength(source) * 0.5)),
    });
    await rename(temporaryPath, outputPath);
    return metadata;
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

async function main() {
  const metadata = await buildWorker({
    sourcePath: process.argv[2] ?? '明文源吗',
    outputPath: process.argv[3] ?? 'dist/worker.js',
  });
  process.stdout.write(`${JSON.stringify(metadata)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
