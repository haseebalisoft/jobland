import { verifyAccessToken } from '../utils/jwt.js';
import { config } from '../config/env.js';
import { query } from '../config/db.js';

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = header.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (payload.role === 'bd') {
      const bdRes = await query(
        "SELECT id, full_name, email, is_active FROM users WHERE id = $1 AND role = 'bd'",
        [payload.sub],
      );
      if (bdRes.rowCount === 0) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const row = bdRes.rows[0];
      if (row.is_active === false) {
        return res.status(403).json({ message: 'BD account is inactive' });
      }
      req.user = {
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
      next();
      return;
    }

    const dbRes = await query(
      'SELECT id, full_name, email, role, is_verified, subscription_plan, is_active FROM users WHERE id = $1',
      [payload.sub],
    );

    if (dbRes.rowCount === 0) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const row = dbRes.rows[0];
    if (!row.is_verified) {
      return res.status(403).json({ message: 'Email not verified' });
    }

    const role =
      row.role ||
      (row.email?.toLowerCase() === config.adminEmail.toLowerCase() ? 'admin' : 'user');

    req.user = {
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

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

