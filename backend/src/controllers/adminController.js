import { query } from '../config/db.js';
import bcrypt from 'bcryptjs';

export async function getUsers(req, res, next) {
  try {
    const result = await query(
      `
      SELECT u.id, u.full_name AS name, u.email, u.subscription_plan, u.is_active, u.created_at,
             COALESCE(
               (SELECT json_agg(json_build_object('id', b.id, 'full_name', b.full_name, 'email', b.email))
                FROM user_bd_assignments uba
                JOIN users b ON b.id = uba.bd_id AND b.role = 'bd'
                WHERE uba.user_id = u.id),
               '[]'::json
             ) AS assigned_bds
      FROM users u
      WHERE (u.role = 'user' OR u.role IS NULL)
      ORDER BY u.created_at DESC
      `,
    );
    const users = result.rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      email: row.email,
      subscription_plan: row.subscription_plan,
      isBlocked: row.is_active === false,
      created_at: row.created_at,
      assigned_bds: Array.isArray(row.assigned_bds) ? row.assigned_bds : [],
    }));
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function getBds(req, res, next) {
  try {
    const result = await query(
      "SELECT id, full_name, email, is_active, created_at FROM users WHERE role = 'bd' AND is_active = true ORDER BY full_name",
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function assignBdToUser(req, res, next) {
  try {
    const { user_id, bd_ids } = req.body || {};
    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required' });
    }
    const adminId = req.user.id;

    await query('DELETE FROM user_bd_assignments WHERE user_id = $1', [user_id]);

    if (Array.isArray(bd_ids) && bd_ids.length > 0) {
      for (const bd_id of bd_ids) {
        await query(
          `INSERT INTO user_bd_assignments (user_id, bd_id, assigned_by) VALUES ($1, $2, $3)
           ON CONFLICT (user_id, bd_id) DO NOTHING`,
          [user_id, bd_id, adminId],
        );
      }
    }

    const updated = await query(
      `SELECT u.id, u.full_name AS name, u.email,
              COALESCE((SELECT json_agg(json_build_object('id', b.id, 'full_name', b.full_name, 'email', b.email))
                        FROM user_bd_assignments uba JOIN users b ON b.id = uba.bd_id AND b.role = 'bd' WHERE uba.user_id = u.id), '[]'::json) AS assigned_bds
       FROM users u WHERE u.id = $1`,
      [user_id],
    );
    const row = updated.rows[0];
    if (!row) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      assigned_bds: Array.isArray(row.assigned_bds) ? row.assigned_bds : [],
    });
  } catch (err) {
    next(err);
  }
}

export async function getSubscriptions(req, res, next) {
  try {
    res.json([]);
  } catch (err) {
    next(err);
  }
}

export async function blockUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `
        UPDATE users
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name AS name, email, subscription_plan, is_active
      `,
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const row = result.rows[0];
    const user = {
      _id: row.id,
      id: row.id,
      name: row.name,
      email: row.email,
      subscription_plan: row.subscription_plan,
      isBlocked: row.is_active === false,
    };
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function unblockUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `
        UPDATE users
        SET is_active = true, updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name AS name, email, subscription_plan, is_active
      `,
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const row = result.rows[0];
    const user = {
      _id: row.id,
      id: row.id,
      name: row.name,
      email: row.email,
      subscription_plan: row.subscription_plan,
      isBlocked: row.is_active === false,
    };
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function resetUserPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { password } = req.body || {};

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters long' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `
        UPDATE users
        SET password_hash = $2,
            is_verified = true,
            is_active = true,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, full_name AS name, email, role, is_active
      `,
      [id, passwordHash],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      isActive: row.is_active === true,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelSubscription(req, res, next) {
  try {
    // No subscriptions table wired – always 404 for now.
    return res.status(404).json({ message: 'Subscription not found' });
  } catch (err) {
    next(err);
  }
}

export async function adminStats(req, res, next) {
  try {
    const userCountRes = await query('SELECT COUNT(*)::int AS count FROM users');
    const totalUsers = userCountRes.rows[0]?.count || 0;

    // No subscription tracking – treat activeSubscribers and revenue as 0.
    const activeSubscribers = 0;
    const monthlyRevenue = 0;

    res.json({ totalUsers, activeSubscribers, monthlyRevenue });
  } catch (err) {
    next(err);
  }
}

export async function getPlansAdmin(req, res, next) {
  try {
    res.json([]);
  } catch (err) {
    next(err);
  }
}

export async function createPlanAdmin(req, res, next) {
  try {
    return res.status(400).json({ message: 'Plans are not configurable in the current schema' });
  } catch (err) {
    next(err);
  }
}

export async function updatePlanAdmin(req, res, next) {
  try {
    return res.status(404).json({ message: 'Plan not found' });
  } catch (err) {
    next(err);
  }
}

