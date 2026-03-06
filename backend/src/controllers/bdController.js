import { query } from '../config/db.js';

export async function getMyUsers(req, res, next) {
  try {
    const bdId = req.user.id;
    if (req.user.role !== 'bd' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'BD or admin only' });
    }

    const result = await query(
      `
      SELECT u.id, u.full_name, u.email
      FROM user_bd_assignments uba
      JOIN users u ON u.id = uba.user_id
      WHERE uba.bd_id = $1
      ORDER BY u.full_name
      `,
      [bdId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}
