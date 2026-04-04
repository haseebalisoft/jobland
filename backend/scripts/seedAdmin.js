/**
 * Seed default admin user for admin login.
 * Run from backend folder: node scripts/seedAdmin.js
 *
 * Default credentials:
 *   Email:    admin@hiredlogics.com  (or set ADMIN_EMAIL in .env)
 *   Password: admin123
 */

// Must run before `db.js`: ESM evaluates all imports before other code, so a
// top-level dotenv.config() below imports would run too late and DB_* would be unset.
import '../src/config/env.js';

import bcrypt from 'bcryptjs';
import { query } from '../src/config/db.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@hiredlogics.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

async function seedAdmin() {
  try {
    const existing = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [ADMIN_EMAIL],
    );
    if (existing.rowCount > 0) {
      await query(
        `UPDATE users SET full_name = $1, password_hash = $2, role = 'admin', is_verified = true, subscription_plan = 'free', is_active = true
         WHERE LOWER(email) = LOWER($3)`,
        [ADMIN_NAME, await bcrypt.hash(ADMIN_PASSWORD, 10), ADMIN_EMAIL],
      );
      console.log('✅ Admin user updated:', ADMIN_EMAIL);
      process.exit(0);
      return;
    }
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await query(
      `INSERT INTO users (full_name, email, password_hash, role, is_verified, subscription_plan, is_active)
       VALUES ($1, $2, $3, 'admin', true, 'free', true)`,
      [ADMIN_NAME, ADMIN_EMAIL, passwordHash],
    );
    console.log('✅ Admin user created:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('   Login at: http://localhost:5173/admin/login');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seedAdmin();
