import { query } from '../config/db.js';

export async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const [userRes, profileRes] = await Promise.all([
      query('SELECT full_name, email FROM users WHERE id = $1', [userId]),
      query(
        `
        SELECT id,
               title,
               summary,
               phone,
               location,
               employment_type,
               experience_years,
               experience_level,
               earliest_start_date,
               preferred_country,
               preferred_city,
               remote_preference,
               work_authorisation,
               job_functions,
               job_types,
               linkedin_url,
               portfolio_url,
               github_url,
               resume_skills,
               is_active
        FROM profiles
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
        [userId],
      ),
    ]);

    const user = userRes.rows[0] || null;
    if (profileRes.rowCount === 0) {
      return res.json({
        profile: null,
        education: [],
        work_experience: [],
        user: user ? { full_name: user.full_name, email: user.email } : null,
      });
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
      user: user ? { full_name: user.full_name, email: user.email } : null,
    });
  } catch (err) {
    next(err);
  }
}

function parsePeriodToDates(period) {
  if (!period || typeof period !== 'string') return { start_date: null, end_date: null, is_current: false };
  const s = period.trim();
  const present = /\bpresent\b/i.test(s);
  const parts = s.split(/\s*[-–—]\s*/i).map((p) => p.trim());
  const startStr = parts[0];
  const endStr = present ? null : parts[1];
  const toDate = (str) => {
    if (!str) return null;
    const m = str.match(/(\w+)\s*(\d{4})?/i);
    if (!m) return null;
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const month = months[(m[1] || '').toLowerCase().slice(0, 3)];
    const year = parseInt(m[2] || new Date().getFullYear(), 10);
    if (month === undefined) return null;
    return new Date(year, month, 1);
  };
  return {
    start_date: toDate(startStr),
    end_date: present ? null : (endStr ? toDate(endStr) : null),
    is_current: !!present,
  };
}

export async function saveProfile(req, res, next) {
  const userId = req.user.id;
  const { profile = {}, education = [], work_experience = [], personal = {}, links = {} } = req.body || {};

  try {
    const pool = (await import('../config/db.js')).default;
    const dbClient = await pool.connect();

    try {
      await dbClient.query('BEGIN');

      if (personal.fullName != null || personal.email != null) {
        const updates = [];
        const values = [];
        let i = 1;
        if (personal.fullName != null) {
          updates.push(`full_name = $${i++}`);
          values.push(personal.fullName);
        }
        if (personal.email != null) {
          updates.push(`email = $${i++}`);
          values.push(personal.email);
        }
        if (updates.length) {
          values.push(userId);
          await dbClient.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`, values);
        }
      }

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

      const title = profile.title ?? '';
      const summary = profile.summary ?? null;
      const phone = profile.phone ?? personal?.phone ?? null;
      const location = profile.location ?? personal?.location ?? null;
      const linkedin_url = links.linkedin ?? profile.linkedin_url ?? null;
      const portfolio_url = links.portfolio ?? profile.portfolio_url ?? null;
      const github_url = links.github ?? profile.github_url ?? null;
      const job_functions = Array.isArray(profile.job_functions) ? profile.job_functions : null;
      const resume_skills = Array.isArray(profile.resume_skills) ? profile.resume_skills : null;

      let profileId;
      if (existingRes.rowCount > 0) {
        profileId = existingRes.rows[0].id;
        await dbClient.query(
          `
            UPDATE profiles
            SET title = $2, summary = $3, phone = $4, location = $5,
                linkedin_url = $6, portfolio_url = $7, github_url = $8,
                employment_type = $9, experience_years = $10, earliest_start_date = $11,
                preferred_country = $12, preferred_city = $13, remote_preference = $14, work_authorisation = $15,
                job_functions = $16, resume_skills = $17,
                is_active = TRUE, updated_at = NOW()
            WHERE id = $1
          `,
          [
            profileId, title, summary, phone, location,
            linkedin_url, portfolio_url, github_url,
            profile.employment_type ?? null, profile.experience_years ?? null, profile.earliest_start_date ?? null,
            profile.preferred_country ?? null, profile.preferred_city ?? null, profile.remote_preference ?? null, profile.work_authorisation ?? null,
            job_functions, resume_skills,
          ],
        );
      } else {
        const insertRes = await dbClient.query(
          `
            INSERT INTO profiles (
              user_id, title, summary, phone, location,
              linkedin_url, portfolio_url, github_url,
              employment_type, experience_years, earliest_start_date,
              preferred_country, preferred_city, remote_preference, work_authorisation,
              job_functions, resume_skills, is_active, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, TRUE, NOW(), NOW())
            RETURNING id
          `,
          [
            userId, title, summary, phone, location,
            linkedin_url, portfolio_url, github_url,
            profile.employment_type ?? null, profile.experience_years ?? null, profile.earliest_start_date ?? null,
            profile.preferred_country ?? null, profile.preferred_city ?? null, profile.remote_preference ?? null, profile.work_authorisation ?? null,
            job_functions, resume_skills,
          ],
        );
        profileId = insertRes.rows[0].id;
      }

      await dbClient.query('DELETE FROM profile_education WHERE profile_id = $1', [profileId]);
      await dbClient.query('DELETE FROM profile_work_experience WHERE profile_id = $1', [profileId]);

      for (const edu of education) {
        let start_date = edu.start_date || null;
        let end_date = edu.end_date || null;
        if ((!start_date || !end_date) && (edu.period || edu.year)) {
          const parsed = parsePeriodToDates(edu.period || String(edu.year));
          if (parsed.start_date) start_date = start_date || parsed.start_date;
          if (parsed.end_date) end_date = parsed.end_date;
          else if (edu.year) end_date = end_date || new Date(parseInt(edu.year, 10), 11, 1);
        }
        await dbClient.query(
          `INSERT INTO profile_education (profile_id, degree, field_of_study, institution, start_date, end_date, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [profileId, edu.degree ?? null, edu.field_of_study ?? null, edu.institution ?? null, start_date, end_date, edu.description ?? null],
        );
      }

      for (const work of work_experience) {
        let start_date = work.start_date ?? null;
        let end_date = work.end_date ?? null;
        let is_current = work.is_current === true;
        if ((!start_date && !end_date) && work.period) {
          const parsed = parsePeriodToDates(work.period);
          start_date = parsed.start_date;
          end_date = parsed.end_date;
          is_current = parsed.is_current;
        }
        const company_name = work.company_name ?? work.company ?? null;
        const job_title = work.job_title ?? work.role ?? null;
        await dbClient.query(
          `INSERT INTO profile_work_experience (profile_id, company_name, job_title, start_date, end_date, is_current, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [profileId, company_name, job_title, start_date, end_date, is_current, work.description ?? null],
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

