import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Prefer DATABASE_URL; fall back to discrete DB_* vars for local development
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${encodeURIComponent(process.env.DB_USER || 'postgres')}:${encodeURIComponent(
    process.env.DB_PASSWORD || '',
  )}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'hiredlogics_prod'}`;

const pool = new Pool({
  connectionString,
  ssl: false,
});

function getDatabaseName() {
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const match = url.match(/\/([^/?]+)(\?|$)/);
      return match ? match[1] : 'from DATABASE_URL';
    } catch (_) {
      return 'from DATABASE_URL';
    }
  }
  return process.env.DB_NAME || 'hiredlogics_prod';
}

export async function connectDB() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    const dbName = getDatabaseName();
    console.log(`✅ PostgreSQL connected successfully → database: ${dbName}`);
  } finally {
    client.release();
  }
}

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

export default pool;