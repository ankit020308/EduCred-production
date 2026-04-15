import { spawn } from 'child_process';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const host = '127.0.0.1';
const port = 8545;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortOpen(targetHost, targetPort) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: targetHost, port: targetPort });

    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.on('error', () => resolve(false));
  });
}

async function waitForRpc(targetHost, targetPort, timeoutMs = 20000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(targetHost, targetPort)) {
      return true;
    }
    await wait(500);
  }

  throw new Error(`Local blockchain RPC did not become ready on ${targetHost}:${targetPort}`);
}

function runDeploy() {
  return new Promise((resolve, reject) => {
    const deploy = spawn(process.execPath, ['./scripts/deploy.js'], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: process.env,
    });

    deploy.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Deploy exited with code ${code}`));
    });
  });
}

async function main() {
  const alreadyRunning = await isPortOpen(host, port);
  let nodeProcess = null;

  if (!alreadyRunning) {
    const hardhatBin = path.join(projectRoot, 'node_modules', '.bin', 'hardhat');

    nodeProcess = spawn(
      process.execPath,
      [
        process.platform === 'win32' ? `${hardhatBin}.cmd` : hardhatBin,
        'node',
        '--hostname', host,
        '--port', String(port),
        '--chain-id', '1337',
      ],
      {
        cwd: projectRoot,
        stdio: 'inherit',
        env: process.env,
      },
    );

    nodeProcess.on('error', (err) => {
      console.error('[chain] Failed to start local blockchain node:', err.message);
      process.exit(1);
    });
  } else {
    console.log(`[chain] Reusing running local blockchain at ${host}:${port}`);
  }

  await waitForRpc(host, port);
  await runDeploy();

  if (!nodeProcess) {
    return;
  }

  const shutdown = (signal) => {
    nodeProcess.kill(signal);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  nodeProcess.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error('[chain] startup failed:', error.message);
  process.exit(1);
});
