import { verifyAccessToken } from '../utils/jwt.js';
import { config } from '../config/env.js';
import { query } from '../config/db.js';

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

async function loadAuthenticatedUser(payload) {
  const dbRes = await query(
    'SELECT id, full_name, email, role, is_verified, subscription_plan, is_active FROM users WHERE id = $1',
    [payload.sub],
  );

  if (dbRes.rowCount === 0) {
    return null;
  }

  const row = dbRes.rows[0];

  if (!row.is_verified || row.is_active === false) {
    const err = new Error('Account is not allowed to access this resource');
    err.statusCode = 403;
    throw err;
  }

  const baseEmail = row.email ? normalizeEmail(row.email) : null;
  const role =
    row.role ||
    (baseEmail && baseEmail === config.adminEmail.toLowerCase() ? 'admin' : 'user');

  return {
    id: row.id,
    _id: row.id,
    name: row.full_name,
    full_name: row.full_name,
    email: row.email,
    role,
    emailVerified: row.is_verified === true,
    isActive: row.is_active === true,
    subscription_plan: row.subscription_plan,
  };
}

async function authenticateRequest(req, { required }) {
  const header = req.headers.authorization;

  if (!header) {
    if (!required) {
      return null;
    }
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }

  if (!header.startsWith('Bearer ')) {
    const err = new Error(required ? 'Unauthorized' : 'Invalid authorization header');
    err.statusCode = 401;
    throw err;
  }

  const token = header.split(' ')[1];
  const payload = verifyAccessToken(token);
  return loadAuthenticatedUser(payload);
}

export async function authMiddleware(req, res, next) {
  try {
    const user = await authenticateRequest(req, { required: true });
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({
      message: err.statusCode === 403 ? err.message : 'Invalid or expired token',
    });
  }
}

export async function optionalAuthMiddleware(req, res, next) {
  try {
    const user = await authenticateRequest(req, { required: false });
    if (user) {
      req.user = user;
    }
    next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({
      message: err.statusCode === 403 ? err.message : 'Invalid or expired token',
    });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

