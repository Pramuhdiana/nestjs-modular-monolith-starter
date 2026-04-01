#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const net = require('net');

const root = process.cwd();
const envPath = path.join(root, '.env');

function parseEnv(content) {
  const out = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^"(.*)"$/, '$1');
    out[key] = value;
  }
  return out;
}

function checkPort(host, port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      settled = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.once('timeout', () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.connect(Number(port), host);
  });
}

async function main() {
  const issues = [];
  const warnings = [];
  const infos = [];

  const major = Number(process.versions.node.split('.')[0]);
  infos.push(`Node.js: v${process.versions.node}`);
  if (major < 20) {
    issues.push('Node.js minimal v20 untuk stabilitas dependency modern.');
  }

  if (!fs.existsSync(envPath)) {
    issues.push('.env belum ada. Jalankan: cp .env.example .env');
  }

  let env = {};
  if (fs.existsSync(envPath)) {
    env = parseEnv(fs.readFileSync(envPath, 'utf8'));
    const required = ['DATABASE_URL', 'JWT_SECRET', 'REDIS_HOST', 'REDIS_PORT'];
    for (const key of required) {
      if (!env[key]) {
        issues.push(`Env wajib belum diisi: ${key}`);
      }
    }
  }

  const redisHost = env.REDIS_HOST || '127.0.0.1';
  const redisPort = env.REDIS_PORT || '6379';
  const dbHost = env.DB_HOST || '127.0.0.1';
  const dbPort = env.DB_PORT || '5432';

  const [redisOk, dbOk] = await Promise.all([
    checkPort(redisHost, redisPort),
    checkPort(dbHost, dbPort),
  ]);

  infos.push(`Redis check (${redisHost}:${redisPort}): ${redisOk ? 'OK' : 'FAIL'}`);
  infos.push(`Postgres check (${dbHost}:${dbPort}): ${dbOk ? 'OK' : 'FAIL'}`);

  if (!redisOk) warnings.push('Redis tidak terjangkau. BullMQ/job mungkin gagal.');
  if (!dbOk) warnings.push('Postgres tidak terjangkau. Prisma migrate/start app akan gagal.');

  console.log('=== Project Doctor ===');
  for (const m of infos) console.log(`- ${m}`);
  if (warnings.length) {
    console.log('\nWarnings:');
    for (const w of warnings) console.log(`- ${w}`);
  }
  if (issues.length) {
    console.log('\nIssues:');
    for (const i of issues) console.log(`- ${i}`);
    process.exitCode = 1;
    return;
  }

  console.log('\nSemua check dasar lolos.');
}

void main();
