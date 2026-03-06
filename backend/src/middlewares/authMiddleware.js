import { verifyAccessToken } from '../utils/jwt.js';
import { config } from '../config/env.js';
import { query } from '../config/db.js';

async function loadAuthenticatedUser(payload) {
  if (payload.role === 'bd') {
    const bdRes = await query(
      "SELECT id, full_name, email, is_active FROM users WHERE id = $1 AND role = 'bd'",
      [payload.sub],
    );
    if (bdRes.rowCount === 0) {
      return null;
    }
    const row = bdRes.rows[0];
    if (row.is_active === false) {
      const err = new Error('BD account is inactive');
      err.statusCode = 403;
      throw err;
    }
    return {
      id: row.id,
      _id: row.id,
      name: row.full_name,
      full_name: row.full_name,
      email: row.email,
      role: 'bd',
      emailVerified: true,
      isActive: true,
      subscription_plan: 'free',
    };
  }

  const dbRes = await query(
    'SELECT id, full_name, email, role, is_verified, subscription_plan, is_active FROM users WHERE id = $1',
    [payload.sub],
  );

  if (dbRes.rowCount === 0) {
    return null;
  }

  const row = dbRes.rows[0];
  if (payload.role === 'admin') {
    return {
      id: row.id,
      _id: row.id,
      name: row.full_name,
      full_name: row.full_name,
      email: row.email,
      role: 'admin',
      emailVerified: true,
      isActive: row.is_active !== false,
      subscription_plan: row.subscription_plan,
    };
  }

  if (!row.is_verified) {
    const err = new Error('Email not verified');
    err.statusCode = 403;
    throw err;
  }

  const role =
    row.role ||
    (row.email?.toLowerCase() === config.adminEmail.toLowerCase() ? 'admin' : 'user');

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

