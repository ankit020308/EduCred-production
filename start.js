#!/usr/bin/env node
/**
 * EduCred Full-Stack Launcher
 * Starts: local blockchain node → deploys contract → starts backend server → starts frontend dev server
 *
 * Usage: node start.js
 */

import { spawn, execSync } from 'child_process';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT     = __dirname;
const BC_DIR   = path.join(ROOT, 'blockchain');
const SRV_DIR  = path.join(ROOT, 'server');
const CLT_DIR  = path.join(ROOT, 'client');

const BLOCKCHAIN_PORT = 8545;
const SERVER_PORT   = 5001;
const FRONTEND_PORT = 3000;

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function isPortOpen(host, port) {
  return new Promise(resolve => {
    const s = net.createConnection({ host, port });
    s.on('connect', () => { s.end(); resolve(true); });
    s.on('error', () => resolve(false));
  });
}

async function waitForPort(host, port, label, timeoutMs = 30000) {
  const start = Date.now();
  process.stdout.write(`⏳ Waiting for ${label}...`);
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(host, port)) {
      console.log(' ✅');
      return;
    }
    await wait(500);
    process.stdout.write('.');
  }
  console.log(' ❌');
  throw new Error(`${label} did not start within ${timeoutMs}ms`);
}

function spawn_(cmd, args, cwd, label) {
  const p = spawn(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, PATH: `${path.dirname(NODE)}:${process.env.PATH}` } });
  p.on('error', err => console.error(`[${label}] spawn error:`, err.message));
  p.on('exit', code => { if (code !== 0 && code !== null) console.warn(`[${label}] exited with code ${code}`); });
  return p;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 EduCred Full-Stack Launcher\n');
  
  // ── 0. Cleanup ──────────────────────────────────────────────────────────────
  console.log('🧹 Cleaning up old processes...');
  try {
    // Kill any processes on 3000, 5001, 8545
    const portsToKill = [BLOCKCHAIN_PORT, SERVER_PORT, FRONTEND_PORT];
    for (const port of portsToKill) {
      try { execSync(`lsof -ti :${port} | xargs kill -9`, { stdio: 'ignore' }); } catch (e) {}
    }
    await wait(1000);
  } catch (err) {}

  const procs = [];

  // ── 1. Local blockchain node ────────────────────────────────────────────────
  const blockchainAlreadyRunning = await isPortOpen('127.0.0.1', BLOCKCHAIN_PORT);
  if (!blockchainAlreadyRunning) {
    console.log('⛓️  Starting local blockchain node...');
    const hardhatBin = path.join(BC_DIR, 'node_modules', '.bin', 'hardhat');
    const nodeProcess = spawn_(
      NODE,
      [(process.platform === 'win32' ? `${hardhatBin}.cmd` : hardhatBin), 'node', '--hostname', '127.0.0.1', '--port', String(BLOCKCHAIN_PORT), '--chain-id', '1337'],
      BC_DIR,
      'hardhat-node'
    );
    procs.push(nodeProcess);
    await waitForPort('127.0.0.1', BLOCKCHAIN_PORT, 'Local blockchain');
  } else {
    console.log('⛓️  Local blockchain already running on port', BLOCKCHAIN_PORT);
  }

  // ── 2. Deploy contract ──────────────────────────────────────────────────────
  console.log('📜 Deploying smart contract...');
  try {
    execSync(`${NODE} ./scripts/deploy.js`, {
      cwd: BC_DIR,
      env: { ...process.env, PATH: `${path.dirname(NODE)}:${process.env.PATH}` },
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('❌ Contract deployment failed:', err.message);
    console.warn('⚠️  Continuing in SIMULATION mode...');
  }

  // ── 3. Backend server ───────────────────────────────────────────────────────
  console.log('\n🖥️  Starting backend server...');
  const serverBin = path.join(SRV_DIR, 'node_modules', '.bin', 'nodemon');
  const serverFallback = path.join(SRV_DIR, 'node_modules', '.bin', 'node');
  const serverScript = path.join(SRV_DIR, 'index.js');
  const server = spawn_(
    NODE,
    [fs.existsSync(serverBin) ? serverBin : serverScript, fs.existsSync(serverBin) ? serverScript : ''].filter(Boolean),
    SRV_DIR,
    'server'
  );
  procs.push(server);
  await waitForPort('127.0.0.1', SERVER_PORT, 'Backend API');

  // ── 4. Frontend dev server ──────────────────────────────────────────────────
  console.log('\n🌐 Starting frontend dev server...');
  const vite = spawn_(NODE, [
    path.join(CLT_DIR, 'node_modules', '.bin', 'vite'),
  ], CLT_DIR, 'vite');
  procs.push(vite);
  await waitForPort('127.0.0.1', FRONTEND_PORT, 'Frontend UI');

  // ── 5. Summary ───────────────────────────────────────────────────────────────
  await wait(2000);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  EduCred is running!\n');
  console.log('   🌐 Frontend:   http://localhost:3000  (or check vite output)');
  console.log('   🖥️  Backend:    http://localhost:5001');
  console.log('   ⛓️  Blockchain: http://127.0.0.1:8545');
  console.log('\n   Press Ctrl+C to stop all services.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = (sig) => {
    console.log(`\n⚠️  ${sig} received — shutting down...`);
    procs.forEach(p => { try { p.kill(); } catch {} });
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(err => {
  console.error('❌ Launcher failed:', err.message);
  process.exit(1);
});
