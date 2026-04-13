#!/usr/bin/env node
/**
 * EduCred Full-Stack Launcher
 * Starts: Ganache → deploys contract → starts backend server → starts frontend dev server
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

const GANACHE_PORT = 8545;
const SERVER_PORT  = 5001;

// ─── Resolve Node binary ────────────────────────────────────────────────────
function findNode() {
  const candidates = [
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
    process.execPath,
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
  const procs = [];

  // ── 1. Ganache ──────────────────────────────────────────────────────────────
  const ganacheAlreadyRunning = await isPortOpen('127.0.0.1', GANACHE_PORT);
  if (!ganacheAlreadyRunning) {
    console.log('⛓️  Starting Ganache local blockchain...');
    const ganacheBin = path.join(BC_DIR, 'node_modules', '.bin', 'ganache');
    const ganache = spawn_(NODE, [
      ganacheBin,
      '--server.port', String(GANACHE_PORT),
      '--chain.chainId', '1337',
      '--wallet.mnemonic', 'test test test test test test test test test test test junk',
      '--wallet.totalAccounts', '10',
      '--wallet.defaultBalance', '1000',
    ], BC_DIR, 'ganache');
    procs.push(ganache);
    await waitForPort('127.0.0.1', GANACHE_PORT, 'Ganache');
  } else {
    console.log('⛓️  Ganache already running on port', GANACHE_PORT);
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

  // ── 5. Summary ───────────────────────────────────────────────────────────────
  await wait(2000);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  EduCred is running!\n');
  console.log('   🌐 Frontend:   http://localhost:5173  (or check vite output)');
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
