import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { env, SERVER_ROOT } from './env.js';

let embedded = null;

async function canConnect(uri) {
  const probe = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 1200 });
  try {
    await probe.asPromise();
    return true;
  } catch {
    return false;
  } finally {
    await probe.close().catch(() => {});
  }
}

/**
 * Resolves which MongoDB to use:
 * 1. MONGO_URI (Atlas or any real server) when provided.
 * 2. In development, a local embedded MongoDB persisted to server/.data/db.
 *    If one is already running (e.g. the dev server is up while you run the seed script),
 *    we reuse it instead of starting a second instance on the same data folder.
 */
async function resolveUri() {
  if (env.MONGO_URI) return { uri: env.MONGO_URI, label: 'MONGO_URI' };
  if (env.isProd) throw new Error('MONGO_URI is required in production (e.g. a MongoDB Atlas connection string).');

  const localUri = `mongodb://127.0.0.1:${env.LOCAL_DB_PORT}/`;
  if (await canConnect(localUri)) return { uri: localUri, label: 'existing local MongoDB' };

  // Keep the downloaded mongod binary in one place no matter which folder the app is started from.
  process.env.MONGOMS_DOWNLOAD_DIR ||= path.join(SERVER_ROOT, 'node_modules', '.cache', 'mongodb-memory-server');
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  fs.mkdirSync(env.LOCAL_DB_PATH, { recursive: true });
  embedded = await MongoMemoryServer.create({
    instance: { dbPath: env.LOCAL_DB_PATH, storageEngine: 'wiredTiger', port: env.LOCAL_DB_PORT },
  });
  return { uri: embedded.getUri(), label: `embedded MongoDB (data in ${env.LOCAL_DB_PATH})` };
}

export async function connectDB(uriOverride) {
  mongoose.set('strictQuery', true);
  const { uri, label } = uriOverride ? { uri: uriOverride, label: 'override' } : await resolveUri();
  await mongoose.connect(uri, { dbName: env.DB_NAME });
  if (!env.isTest) console.log(`[db] connected via ${label}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  if (embedded && mongoose.connection.readyState === 1) {
    // On Windows the embedded mongod is stopped with a hard kill, so flush data files first.
    await mongoose.connection.db.admin().command({ fsync: 1 }).catch(() => {});
  }
  await mongoose.disconnect();
  if (embedded) {
    await embedded.stop({ doCleanup: false, force: false });
    embedded = null;
  }
}
