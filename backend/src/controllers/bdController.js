import { query } from '../config/db.js';

/**
 * Returns users assigned to this BD by admin (user_bd_assignments where bd_id = current BD's user id).
 * BD's id comes from users table (role='bd'); admin stores that same id when assigning.
 */
export async function getMyUsers(req, res, next) {
  try {
    const bdId = req.user?.id;
    if (!bdId || (req.user.role !== 'bd' && req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'BD or admin only' });
    }

    const result = await query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        (
          SELECT p.title
          FROM profiles p
          WHERE p.user_id = u.id
          ORDER BY p.created_at DESC
          LIMIT 1
        ) AS profile_title
      FROM user_bd_assignments uba
      JOIN users u ON u.id = uba.user_id
      WHERE uba.bd_id = $1
      ORDER BY u.full_name
      `,
      [bdId],
    );
    res.json(Array.isArray(result.rows) ? result.rows : []);
  } catch (err) {
    next(err);
  }
}
