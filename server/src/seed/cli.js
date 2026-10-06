import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from './seed.js';

// Usage: npm run seed   (wipes the database and reloads the sample data)
try {
  await connectDB();
  const result = await seedDatabase({ log: true });
  console.log('[seed] sample data loaded:', result);
} catch (err) {
  console.error('[seed] failed:', err);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
