import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

async function readRequiredFile(path, label) {
  let content;
  try {
    content = await readFile(path);
  } catch (error) {
    throw new Error(`${label} file is missing: ${path}`, { cause: error });
  }
  if (content.length === 0 || content.toString('utf8').trim().length === 0) {
    throw new Error(`${label} file is empty: ${path}`);
  }
  return content;
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function checkModuleSyntax(content) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '--check'], {
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `Node exited with status ${code}`));
    });
    child.stdin.end(content);
  });
}

export async function verifyWorker({
  sourcePath,
  outputPath,
  minimumBytes = 1024,
}) {
  const source = await readRequiredFile(sourcePath, 'source');
  const output = await readRequiredFile(outputPath, 'output');

  if (output.length < minimumBytes) {
    throw new Error(`output file is smaller than ${minimumBytes} bytes`);
  }

  const sourceHash = sha256(source);
  const outputHash = sha256(output);
  if (sourceHash === outputHash) {
    throw new Error('output must differ from source');
  }

  try {
    await checkModuleSyntax(output);
  } catch (error) {
    throw new Error('generated Worker syntax check failed', { cause: error });
  }

  return {
    sourceHash,
    outputHash,
    sourceBytes: source.length,
    outputBytes: output.length,
  };
}

async function main() {
  const metadata = await verifyWorker({
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
