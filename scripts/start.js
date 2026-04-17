#!/usr/bin/env node
/**
 * EduCred Full-Stack Launcher
 * Starts: local blockchain node → deploys contract → starts backend server → starts frontend dev server
 *
 * Usage: node start.js
 */

import { spawn, execSync, exec } from 'child_process';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Since this is now in /scripts, the project ROOT is one level up
const ROOT = path.join(__dirname, '..');
const BC_DIR = path.join(ROOT, 'blockchain');
const SRV_DIR = path.join(ROOT, 'server');
const CLT_DIR = path.join(ROOT, 'client');

const BLOCKCHAIN_PORT = 8545;
const SERVER_PORT = 5001;
const FRONTEND_PORT = 3000;

// ─── Formatting Helpers ──────────────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✔ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✖ ${msg}${colors.reset}`),
  step: (msg) => console.log(`\n${colors.bold}${colors.cyan}▶ ${msg}${colors.reset}`)
};

// ─── Resolve Node binary ────────────────────────────────────────────────────
function findNode() {
  const candidates = [
    process.execPath,
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('Cannot find Node.js binary.');
}

const NODE = findNode();

// ─── System Helpers ─────────────────────────────────────────────────────────
const wait = (ms) => new Promise(r => setTimeout(r, ms));

function isPortOpen(host, port) {
  return new Promise(resolve => {
    const s = net.createConnection({ host, port });
    s.on('connect', () => { s.end(); resolve(true); });
    s.on('error', () => resolve(false));
  });
}

async function waitForPort(host, port, label, timeoutMs = 30000) {
  const start = Date.now();
  process.stdout.write(`${colors.dim}  Waiting for ${label} on port ${port}...${colors.reset}`);

  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(host, port)) {
      console.log(` ${colors.green}Ready${colors.reset}`);
      return;
    }
    await wait(500);
    process.stdout.write(`${colors.dim}.${colors.reset}`);
  }
  console.log(` ${colors.red}Timeout${colors.reset}`);
  throw new Error(`${label} did not start within ${timeoutMs}ms`);
}

function spawnProcess(cmd, args, cwd, label) {
  const p = spawn(cmd, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, PATH: `${path.dirname(NODE)}:${process.env.PATH}` }
  });

  p.on('error', err => log.error(`[${label}] spawn error: ${err.message}`));
  p.on('exit', code => {
    if (code !== 0 && code !== null) log.warn(`[${label}] exited with code ${code}`);
  });

  return p;
}

function openBrowser(url) {
  const platform = os.platform();
  let cmd = '';

  switch (platform) {
    case 'darwin': cmd = `open ${url}`; break;
    case 'win32': cmd = `start ${url}`; break;
    default: cmd = `xdg-open ${url}`; break; // Linux
  }

  exec(cmd, (err) => {
    if (err) log.warn(`Could not automatically open browser. Please navigate to ${url}`);
  });
}

// ─── Main Execution ───────────────────────────────────────────────────────────
async function main() {
  console.clear();
  console.log(`${colors.bold}${colors.green}🚀 Starting EduCred Full-Stack Environment${colors.reset}\n`);

  const procs = [];

  // ── 0. Cleanup ──────────────────────────────────────────────────────────────
  log.step('Cleaning up orphan processes...');
  try {
    const portsToKill = [BLOCKCHAIN_PORT, SERVER_PORT, FRONTEND_PORT];
    const isWindows = os.platform() === 'win32';

    for (const port of portsToKill) {
      try {
        if (isWindows) {
          execSync(`FOR /F "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /F /PID %a`, { stdio: 'ignore' });
        } else {
          execSync(`lsof -ti :${port} | xargs kill -9`, { stdio: 'ignore' });
        }
      } catch (e) { /* Port is already free */ }
    }
    log.success('Ports cleared and stabilized.');
  } catch (err) {
    log.warn('Process cleanup encountered an issue, continuing anyway.');
  }

  // ── 1. Local blockchain node ────────────────────────────────────────────────
  log.step('Initializing Local Blockchain...');
  const blockchainRunning = await isPortOpen('127.0.0.1', BLOCKCHAIN_PORT);

  if (!blockchainRunning) {
    const hardhatBin = path.join(BC_DIR, 'node_modules', '.bin', 'hardhat');
    const nodeProcess = spawnProcess(
      NODE,
      [(os.platform() === 'win32' ? `${hardhatBin}.cmd` : hardhatBin), 'node', '--hostname', '127.0.0.1', '--port', String(BLOCKCHAIN_PORT), '--chain-id', '1337'],
      BC_DIR,
      'hardhat-node'
    );
    procs.push(nodeProcess);
    await waitForPort('127.0.0.1', BLOCKCHAIN_PORT, 'Blockchain');
  } else {
    log.info(`Blockchain already running on port ${BLOCKCHAIN_PORT}`);
  }

  // ── 2. Deploy contract ──────────────────────────────────────────────────────
  log.step('Deploying Smart Contracts...');
  try {
    execSync(`${NODE} ./scripts/deploy.js`, {
      cwd: BC_DIR,
      env: { ...process.env, PATH: `${path.dirname(NODE)}:${process.env.PATH}` },
      stdio: 'inherit',
    });
    log.success('Contracts deployed successfully.');
  } catch (err) {
    log.error(`Contract deployment failed: ${err.message}`);
    log.warn('Continuing in SIMULATION mode...');
  }

  // ── 3. Backend server ───────────────────────────────────────────────────────
  log.step('Booting Backend API...');
  const serverBin = path.join(SRV_DIR, 'node_modules', '.bin', 'nodemon');
  const serverScript = path.join(SRV_DIR, 'index.js');
  const useNodemon = fs.existsSync(serverBin);

  const server = spawnProcess(
    NODE,
    [useNodemon ? serverBin : serverScript, useNodemon ? serverScript : ''].filter(Boolean),
    SRV_DIR,
    'backend'
  );
  procs.push(server);
  await waitForPort('127.0.0.1', SERVER_PORT, 'Backend Server');

  // ── 4. Frontend dev server ──────────────────────────────────────────────────
  log.step('Starting Frontend UI...');
  const viteBin = path.join(CLT_DIR, 'node_modules', '.bin', 'vite');
  const vite = spawnProcess(
    NODE,
    [(os.platform() === 'win32' ? `${viteBin}.cmd` : viteBin)],
    CLT_DIR,
    'frontend'
  );
  procs.push(vite);

  //  FIXED (no timeout issue anymore)
  log.info('Waiting for frontend to initialize...');
  await wait(5000);

  // ── 5. Summary & Auto-Launch ─────────────────────────────────────────────────
  await wait(1000);
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`  ${colors.green}${colors.bold}✅ EduCred Environment is Live!${colors.reset}\n`);
  console.log(`  🌐 Frontend:   ${colors.cyan}http://localhost:${FRONTEND_PORT}${colors.reset}`);
  console.log(`  🖥️  Backend:    ${colors.cyan}http://localhost:${SERVER_PORT}${colors.reset}`);
  console.log(`  ⛓️  Blockchain: ${colors.cyan}http://127.0.0.1:${BLOCKCHAIN_PORT}${colors.reset}\n`);
  console.log(`  ${colors.dim}Press Ctrl+C to stop all services.${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // Launch the browser automatically
  log.info('Launching web app in your default browser...');
  openBrowser(`http://localhost:${FRONTEND_PORT}`);

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = (sig) => {
    console.log(`\n${colors.yellow}⚠️  ${sig} received — gracefully shutting down processes...${colors.reset}`);
    procs.forEach(p => { try { p.kill(); } catch { } });
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(err => {
  log.error(`Launcher failed: ${err.message}`);
  process.exit(1);
});