import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { query } from '../config/db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendEmail } from '../utils/email.js';

function mapRowToUser(row) {
  if (!row) return null;
  const role =
    row.role ||
    (row.email?.toLowerCase() === config.adminEmail.toLowerCase() ? 'admin' : 'user');

  const user = {
    id: row.id,
    _id: row.id,
    name: row.full_name,
    full_name: row.full_name,
    email: row.email,
    role,
    emailVerified: row.is_verified === true,
    isBlocked: row.is_active === false,
    isActive: row.is_active === true,
    subscription_plan: row.subscription_plan,
  };
  return user;
}

function buildPasswordSetupUrl(token) {
  const clientBase = config.clientUrl.replace(/\/$/, '');
  return `${clientBase}/set-password?token=${encodeURIComponent(token)}`;
}

function createPasswordSetupToken({ userId, passwordHash }) {
  return jwt.sign(
    {
      sub: userId,
      type: 'password_setup',
      pwdv: crypto.createHash('sha256').update(passwordHash).digest('hex'),
    },
    config.passwordSetup.secret,
    { expiresIn: config.passwordSetup.expiresIn },
  );
}

export async function registerUser({ full_name, email, password }) {
  const existingRes = await query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [email],
  );
  if (existingRes.rowCount > 0) {
    const err = new Error('Email already in use');
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role =
    email?.toLowerCase() === config.adminEmail.toLowerCase() ? 'admin' : 'user';

  const insertRes = await query(
    `
      INSERT INTO users (full_name, email, password_hash, role, subscription_plan, is_active)
      VALUES ($1, $2, $3, $4, 'free', false)
      RETURNING id, full_name, email, role, is_verified, subscription_plan, is_active
    `,
    [full_name, email, passwordHash, role],
  );

  const row = insertRes.rows[0];
  const user = mapRowToUser(row);

  // Generate email verification JWT
  const token = jwt.sign(
    { sub: user.id, type: 'email_verification' },
    config.emailVerification.secret,
    { expiresIn: config.emailVerification.expiresIn },
  );

  const apiBase = `${config.clientUrl.replace(/\/$/, '').replace('5173', '5000')}/api`;
  const verifyUrl = `${apiBase}/auth/verify-email?token=${token}`;
  console.log('Verification link for new user:', verifyUrl);

  try {
    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      html: `<p>Hi ${user.full_name},</p>
             <p>Please verify your email by clicking the link below:</p>
             <p><a href="${verifyUrl}">Verify Email</a></p>
             <p>If you did not sign up, you can ignore this email.</p>`,
    });
  } catch (e) {
    // In production you might want to log this to an error tracker.
    // We do not fail the signup if email sending fails.
    console.error('Failed to send verification email:', e?.message || e);
  }

  return user;
}

/**
 * Register a BD (Business Developer). Stored in users table with role='bd'.
 * No email verification; BDs can log in immediately. Appears in admin BD dropdown.
 */
export async function registerBd({ email, password }) {
  const existingRes = await query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [email],
  );
  if (existingRes.rowCount > 0) {
    const err = new Error('Email already in use');
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const fullName = (email.split('@')[0] || 'BD').replace(/[^a-zA-Z0-9\s]/g, ' ') || 'BD';

  const insertRes = await query(
    `
      INSERT INTO users (full_name, email, password_hash, role, is_verified, subscription_plan, is_active)
      VALUES ($1, $2, $3, 'bd', true, 'free', true)
      RETURNING id, full_name, email, is_active, created_at
    `,
    [fullName, email, passwordHash],
  );

  const row = insertRes.rows[0];
  return {
    id: row.id,
    _id: row.id,
    name: row.full_name,
    full_name: row.full_name,
    email: row.email,
    role: 'bd',
    isActive: row.is_active === true,
  };
}

/**
 * Login BD from users table (role='bd'). Returns bd object for JWT.
 */
export async function loginBd({ email, password }) {
  const res = await query(
    `SELECT id, full_name, email, password_hash, is_active FROM users WHERE LOWER(email) = LOWER($1) AND role = 'bd'`,
    [email],
  );
  if (res.rowCount === 0) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }
  const row = res.rows[0];
  const match = await bcrypt.compare(password, row.password_hash);
  if (!match) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }
  if (row.is_active === false) {
    const err = new Error('Account is inactive');
    err.statusCode = 403;
    throw err;
  }
  const bd = {
    id: row.id,
    _id: row.id,
    name: row.full_name,
    full_name: row.full_name,
    email: row.email,
    role: 'bd',
    isActive: true,
  };
  return bd;
}

export async function verifyEmail(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.emailVerification.secret);
  } catch {
    const err = new Error('Invalid or expired verification token');
    err.statusCode = 400;
    throw err;
  }

  if (payload.type && payload.type !== 'email_verification') {
    const err = new Error('Invalid or expired verification token');
    err.statusCode = 400;
    throw err;
  }

  const updateRes = await query(
    `
      UPDATE users
      SET is_verified = true,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, full_name, email, role, is_verified, subscription_plan, is_active
    `,
    [payload.sub],
  );

  if (updateRes.rowCount === 0) {
    const err = new Error('Invalid or expired verification token');
    err.statusCode = 400;
    throw err;
  }

  const row = updateRes.rows[0];
  return mapRowToUser(row);
}

export async function loginUser({ email, password }) {
  const res = await query(
    `
      SELECT id, full_name, email, password_hash, role, is_verified, subscription_plan, is_active
      FROM users
      WHERE LOWER(email) = LOWER($1)
    `,
    [email],
  );

  if (res.rowCount === 0) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const row = res.rows[0];
  const passwordMatch = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatch) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  if (!row.is_verified) {
    const err = new Error('Email not verified');
    err.statusCode = 403;
    throw err;
  }

  const user = mapRowToUser(row);
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const decoded = jwt.decode(refreshToken);
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `,
    [user.id, refreshToken, expiresAt],
  );

  return { user, accessToken, refreshToken };
}

/** Admin-only login: only allows users with role = 'admin'. Skips email verification check. */
export async function loginAdmin({ email, password }) {
  const res = await query(
    `
      SELECT id, full_name, email, password_hash, role, is_verified, subscription_plan, is_active
      FROM users
      WHERE LOWER(email) = LOWER($1) AND role = 'admin'
    `,
    [email],
  );

  if (res.rowCount === 0) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const row = res.rows[0];
  const passwordMatch = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatch) {
    const err = new Error('Invalid credentials');
    err.statusCode = 401;
    throw err;
  }

  const user = mapRowToUser(row);
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const decoded = jwt.decode(refreshToken);
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `,
    [user.id, refreshToken, expiresAt],
  );

  return { user, accessToken, refreshToken };
}

export async function refreshTokens(refreshToken) {
  const payload = verifyRefreshToken(refreshToken);

  const tokenRes = await query(
    `
      SELECT id, user_id, token, expires_at
      FROM refresh_tokens
      WHERE token = $1
    `,
    [refreshToken],
  );

  if (
    tokenRes.rowCount === 0 ||
    new Date(tokenRes.rows[0].expires_at) <= new Date()
  ) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  const userId = tokenRes.rows[0].user_id;

  const userRes = await query(
    `
      SELECT id, full_name, email, password_hash, role, is_verified, subscription_plan, is_active
      FROM users
      WHERE id = $1
    `,
    [userId],
  );

  if (userRes.rowCount === 0) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  const row = userRes.rows[0];
  if (!row.is_verified) {
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    throw err;
  }

  // Rotate refresh token: delete old, insert new
  await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

  const user = mapRowToUser(row);
  const accessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  const decoded = jwt.decode(newRefreshToken);
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `,
    [user.id, newRefreshToken, expiresAt],
  );

  return { accessToken, refreshToken: newRefreshToken };
}

export async function sendPasswordSetupEmail({ userId }) {
  const res = await query(
    `
      SELECT id, full_name, email, password_hash
      FROM users
      WHERE id = $1
    `,
    [userId],
  );

  if (res.rowCount === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const row = res.rows[0];
  const token = createPasswordSetupToken({
    userId: row.id,
    passwordHash: row.password_hash,
  });
  const setupUrl = buildPasswordSetupUrl(token);

  await sendEmail({
    to: row.email,
    subject: 'Set your JobLand password',
    html: `<p>Hi ${row.full_name || 'there'},</p>
           <p>Your JobLand account was created after your successful Stripe checkout.</p>
           <p>Please set your password to access your dashboard:</p>
           <p><a href="${setupUrl}">Set Password</a></p>
           <p>If you already have an account with this email, you can ignore this message and sign in normally.</p>`,
  });

  return { sent: true };
}

export async function setPasswordFromToken({ token, password }) {
  if (!token) {
    const err = new Error('Password setup token is required');
    err.statusCode = 400;
    throw err;
  }

  if (!password || password.length < 8) {
    const err = new Error('Password must be at least 8 characters');
    err.statusCode = 400;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(token, config.passwordSetup.secret);
  } catch {
    const err = new Error('Invalid or expired password setup token');
    err.statusCode = 400;
    throw err;
  }

  if (payload.type !== 'password_setup') {
    const err = new Error('Invalid or expired password setup token');
    err.statusCode = 400;
    throw err;
  }

  const userRes = await query(
    `
      SELECT id, full_name, email, role, password_hash, is_verified, subscription_plan, is_active
      FROM users
      WHERE id = $1
    `,
    [payload.sub],
  );

  if (userRes.rowCount === 0) {
    const err = new Error('Invalid or expired password setup token');
    err.statusCode = 400;
    throw err;
  }

  const row = userRes.rows[0];
  const passwordVersion = crypto
    .createHash('sha256')
    .update(row.password_hash)
    .digest('hex');

  if (payload.pwdv !== passwordVersion) {
    const err = new Error('This password setup link has already been used');
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const updateRes = await query(
    `
      UPDATE users
      SET password_hash = $2,
          is_verified = true,
          is_active = true,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, full_name, email, role, is_verified, subscription_plan, is_active
    `,
    [row.id, passwordHash],
  );

  const user = mapRowToUser(updateRes.rows[0]);
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const decoded = jwt.decode(refreshToken);
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `,
    [user.id, refreshToken, expiresAt],
  );

  return { user, accessToken, refreshToken };
}

export async function updateUserProfile(userId, full_name) {
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
    const err = new Error('Full name is required');
    err.statusCode = 400;
    throw err;
  }
  const res = await query(
    `
      UPDATE users
      SET full_name = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, full_name, email, role, is_verified, subscription_plan, is_active
    `,
    [userId, full_name.trim()],
  );
  if (res.rowCount === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return mapRowToUser(res.rows[0]);
}

export async function changePassword(userId, currentPassword, newPassword) {
  if (!currentPassword || !newPassword) {
    const err = new Error('Current password and new password are required');
    err.statusCode = 400;
    throw err;
  }
  if (newPassword.length < 6) {
    const err = new Error('New password must be at least 6 characters');
    err.statusCode = 400;
    throw err;
  }
  const res = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId],
  );
  if (res.rowCount === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  const match = await bcrypt.compare(currentPassword, res.rows[0].password_hash);
  if (!match) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 400;
    throw err;
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query(
    'UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1',
    [userId, passwordHash],
  );
  return true;
}

