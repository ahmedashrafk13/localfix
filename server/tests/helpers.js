// Shared setup for the API test files: a throwaway in-memory MongoDB, the real seed data and the
// real Express app. Each test file runs in its own process, so each gets its own database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'localfix-uploads-'));
process.env.PRIVATE_UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'localfix-private-'));
process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
process.env.ANTHROPIC_API_KEY = ''; // the suite must never call a paid API
process.env.MONGOMS_DOWNLOAD_DIR ||= path.resolve(import.meta.dirname, '..', 'node_modules', '.cache', 'mongodb-memory-server');

const { MongoMemoryServer } = await import('mongodb-memory-server');
const { default: request } = await import('supertest');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { seedDatabase } = await import('../src/seed/seed.js');

export { request };
export const H = { 'X-Requested-With': 'LocalFix' };

let mongo;
export let app;

export async function startApp() {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
  await seedDatabase();
  app = createApp();
  return app;
}

export async function stopApp() {
  await disconnectDB();
  await mongo.stop();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
  fs.rmSync(process.env.PRIVATE_UPLOAD_DIR, { recursive: true, force: true });
}

export async function login(email, password = 'Demo@1234') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').set(H).send({ email, password });
  assert.equal(res.status, 200, `login failed for ${email}: ${JSON.stringify(res.body)}`);
  return agent;
}

/** A fetch() stand-in: `handler(url)` returns a JSON body, a { status, body } pair, or throws. */
export function fakeFetch(handler) {
  const calls = [];
  const fn = async (url) => {
    calls.push(String(url));
    const out = await handler(new URL(url));
    const status = out?.status ?? 200;
    const body = out?.status ? out.body : out;
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

export async function waitFor(check, { timeout = 3000, step = 25 } = {}) {
  const started = Date.now();
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() - started > timeout) throw new Error('waitFor timed out');
    await new Promise((resolve) => setTimeout(resolve, step));
  }
}
