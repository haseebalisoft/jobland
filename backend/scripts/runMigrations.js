/**
 * Applies SQL files in backend/db/migrations in lexical order.
 * Skips 001_initial.sql when public.users already exists (avoids re-running full bootstrap).
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Pool } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${encodeURIComponent(process.env.DB_USER || 'postgres')}:${encodeURIComponent(
    process.env.DB_PASSWORD || '',
  )}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'hiredlogics_prod'}`;

const pool = new Pool({ connectionString, ssl: process.env.DATABASE_URL?.includes('amazonaws') ? { rejectUnauthorized: false } : false });

async function main() {
  const dir = path.join(__dirname, '../db/migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  const client = await pool.connect();
  try {
    for (const file of files) {
      const full = path.join(dir, file);
      const sql = fs.readFileSync(full, 'utf8');

      if (file === '001_initial.sql') {
        const r = await client.query("SELECT to_regclass('public.users') AS u");
        if (r.rows[0]?.u) {
          console.log(`[skip] ${file} (users table already exists)`);
          continue;
        }
      }

      console.log(`[run] ${file}`);
      await client.query(sql);
      console.log(`[ok]  ${file}`);
    }
    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
