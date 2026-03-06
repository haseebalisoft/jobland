import { query } from '../config/db.js';

export async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const profileRes = await query(
      `
        SELECT id,
               title,
               employment_type,
               experience_years,
               earliest_start_date,
               preferred_country,
               preferred_city,
               remote_preference,
               work_authorisation,
               is_active
        FROM profiles
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId],
    );

    if (profileRes.rowCount === 0) {
      return res.json({ profile: null, education: [], work_experience: [] });
    }

    const profile = profileRes.rows[0];
    const profileId = profile.id;

    const eduRes = await query(
      `
        SELECT id,
               degree,
               field_of_study,
               institution,
               start_date,
               end_date,
               description
        FROM profile_education
        WHERE profile_id = $1
        ORDER BY start_date DESC NULLS LAST
      `,
      [profileId],
    );

    const workRes = await query(
      `
        SELECT id,
               company_name,
               job_title,
               start_date,
               end_date,
               is_current,
               description
        FROM profile_work_experience
        WHERE profile_id = $1
        ORDER BY start_date DESC NULLS LAST
      `,
      [profileId],
    );

    res.json({
      profile,
      education: eduRes.rows,
      work_experience: workRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function saveProfile(req, res, next) {
  const userId = req.user.id;
  const { profile, education = [], work_experience = [] } = req.body || {};

  if (!profile) {
    return res.status(400).json({ message: 'Profile data is required' });
  }

  const client = await (await import('../config/db.js')).default.connect
    ? (await import('../config/db.js')).default
    : null;

  try {
    const pool = (await import('../config/db.js')).default;
    const dbClient = await pool.connect();

    try {
      await dbClient.query('BEGIN');

      const existingRes = await dbClient.query(
        `
          SELECT id
          FROM profiles
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [userId],
      );

      let profileId;
      if (existingRes.rowCount > 0) {
        profileId = existingRes.rows[0].id;
        await dbClient.query(
          `
            UPDATE profiles
            SET
              title = $2,
              employment_type = $3,
              experience_years = $4,
              earliest_start_date = $5,
              preferred_country = $6,
              preferred_city = $7,
              remote_preference = $8,
              work_authorisation = $9,
              is_active = TRUE,
              updated_at = NOW()
            WHERE id = $1
          `,
          [
            profileId,
            profile.title || null,
            profile.employment_type || null,
            profile.experience_years || null,
            profile.earliest_start_date || null,
            profile.preferred_country || null,
            profile.preferred_city || null,
            profile.remote_preference || null,
            profile.work_authorisation || null,
          ],
        );
      } else {
        const insertRes = await dbClient.query(
          `
            INSERT INTO profiles (
              id,
              user_id,
              title,
              employment_type,
              experience_years,
              earliest_start_date,
              preferred_country,
              preferred_city,
              remote_preference,
              work_authorisation,
              is_active,
              created_at,
              updated_at
            )
            VALUES (
              gen_random_uuid(),
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              TRUE,
              NOW(),
              NOW()
            )
            RETURNING id
          `,
          [
            userId,
            profile.title || null,
            profile.employment_type || null,
            profile.experience_years || null,
            profile.earliest_start_date || null,
            profile.preferred_country || null,
            profile.preferred_city || null,
            profile.remote_preference || null,
            profile.work_authorisation || null,
          ],
        );
        profileId = insertRes.rows[0].id;
      }

      await dbClient.query('DELETE FROM profile_education WHERE profile_id = $1', [profileId]);
      await dbClient.query('DELETE FROM profile_work_experience WHERE profile_id = $1', [profileId]);

      for (const edu of education) {
        await dbClient.query(
          `
            INSERT INTO profile_education (
              id,
              profile_id,
              degree,
              field_of_study,
              institution,
              start_date,
              end_date,
              description
            )
            VALUES (
              gen_random_uuid(),
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7
            )
          `,
          [
            profileId,
            edu.degree || null,
            edu.field_of_study || null,
            edu.institution || null,
            edu.start_date || null,
            edu.end_date || null,
            edu.description || null,
          ],
        );
      }

      for (const work of work_experience) {
        await dbClient.query(
          `
            INSERT INTO profile_work_experience (
              id,
              profile_id,
              company_name,
              job_title,
              start_date,
              end_date,
              is_current,
              description
            )
            VALUES (
              gen_random_uuid(),
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7
            )
          `,
          [
            profileId,
            work.company_name || null,
            work.job_title || null,
            work.start_date || null,
            work.end_date || null,
            work.is_current === true,
            work.description || null,
          ],
        );
      }

      await dbClient.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await dbClient.query('ROLLBACK');
      throw err;
    } finally {
      dbClient.release();
    }
  } catch (err) {
    next(err);
  }
}

