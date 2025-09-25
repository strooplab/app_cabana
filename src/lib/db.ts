// lib/db.ts
import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || '';

const poolConfig = connectionString
  ? { connectionString, ssl: { rejectUnauthorized: false } }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: (process.env.DB_PASSWORD || '').trim(),
      port: parseInt(process.env.DB_PORT || '5432', 10),
      ssl: { rejectUnauthorized: false },
    };

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

let pool: Pool;

try {
  pool = global.__pgPool ?? new Pool(poolConfig);

  if (!global.__pgPool) {
    global.__pgPool = pool;
  }
} catch (err) {
  console.error("❌ Pool init error:", err);
  throw err;
}

export default pool;
