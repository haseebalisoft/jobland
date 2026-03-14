import pool from '../config/db.js';

/**
 * Build the resume-maker format from DB (profiles + profile_education + profile_work_experience + user).
 */
function toBuilderProfile(user, profile, education, workExperience) {
  const personal = {
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
  };
  const professional = {
    currentTitle: profile?.title || '',
    summary: profile?.summary || '',
    skills: (Array.isArray(profile?.resume_skills) && profile.resume_skills.length) ? [...profile.resume_skills] : (Array.isArray(profile?.job_functions) ? [...profile.job_functions] : []),
    workExperience: (workExperience || []).map((w) => ({
      company: w.company_name || '',
      role: w.job_title || '',
      period: formatPeriod(w.start_date, w.end_date, w.is_current),
      description: w.description || '',
    })),
  };
  const educationList = (education || []).map((e) => ({
    degree: e.degree || '',
    institution: e.institution || '',
    year: e.end_date ? String(new Date(e.end_date).getFullYear()) : '',
    period: formatEduPeriod(e.start_date, e.end_date),
    field_of_study: e.field_of_study || '',
    description: e.description || '',
  }));
  const links = {
    linkedin: profile?.linkedin_url || '',
    github: profile?.github_url || '',
    portfolio: profile?.portfolio_url || '',
  };
  return { personal, professional, education: educationList, links };
}

function formatPeriod(startDate, endDate, isCurrent) {
  if (isCurrent && startDate) return `${formatMonthYear(startDate)} – Present`;
  if (startDate && endDate) return `${formatMonthYear(startDate)} – ${formatMonthYear(endDate)}`;
  if (startDate) return formatMonthYear(startDate);
  return '';
}

function formatEduPeriod(startDate, endDate) {
  if (startDate && endDate) return `${formatMonthYear(startDate)} – ${formatMonthYear(endDate)}`;
  if (endDate) return String(new Date(endDate).getFullYear());
  return '';
}

function formatMonthYear(d) {
  if (!d) return '';
  const date = new Date(d);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Parse "Jan 2020 - Present" or "Jan 2020 – Dec 2022" to start_date, end_date, is_current.
 */
function parsePeriod(period) {
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
  const start_date = toDate(startStr);
  const end_date = present ? null : toDate(endStr);
  return { start_date, end_date, is_current: !!present };
}

/**
 * Get resume profile for the builder (user + profile + education + work_experience).
 */
export async function getResumeProfile(userId) {
  const userRes = await pool.query(
    'SELECT id, full_name, email FROM users WHERE id = $1',
    [userId]
  );
  const user = userRes.rows[0] || null;

  const profileRes = await pool.query(
    `
    SELECT id, title, summary, phone, location, job_functions, resume_skills,
           linkedin_url, portfolio_url, github_url
    FROM profiles
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [userId]
  );
  const profile = profileRes.rows[0] || null;
  const profileId = profile?.id || null;

  let education = [];
  let workExperience = [];
  if (profileId) {
    const [eduRes, workRes] = await Promise.all([
      pool.query(
        `SELECT id, degree, field_of_study, institution, start_date, end_date, description
         FROM profile_education WHERE profile_id = $1 ORDER BY end_date DESC NULLS LAST, start_date DESC NULLS LAST`,
        [profileId]
      ),
      pool.query(
        `SELECT id, company_name, job_title, start_date, end_date, is_current, description
         FROM profile_work_experience WHERE profile_id = $1 ORDER BY start_date DESC NULLS LAST`,
        [profileId]
      ),
    ]);
    education = eduRes.rows;
    workExperience = workRes.rows;
  }

  return toBuilderProfile(user, profile, education, workExperience);
}

/**
 * Save builder-format profile to DB (profiles + profile_education + profile_work_experience; optionally user).
 */
export async function saveResumeProfile(userId, builderProfile) {
  const { personal = {}, professional = {}, education = [], links = {} } = builderProfile;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update user name/email if provided
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
        await client.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`,
          values
        );
      }
    }

    let profileRow = await client.query(
      'SELECT id FROM profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    let profileId = profileRow.rows[0]?.id;

    const title = professional.currentTitle ?? '';
    const summary = professional.summary ?? null;
    const phone = personal.phone ?? null;
    const location = personal.location ?? null;
    const resume_skills = Array.isArray(professional.skills) ? professional.skills : [];
    const linkedin_url = links.linkedin ?? null;
    const portfolio_url = links.portfolio ?? null;
    const github_url = links.github ?? null;

    if (profileId) {
      await client.query(
        `
        UPDATE profiles
        SET title = $2, summary = $3, phone = $4, location = $5,
            resume_skills = $6, linkedin_url = $7, portfolio_url = $8, github_url = $9,
            updated_at = NOW()
        WHERE id = $1
        `,
        [profileId, title, summary, phone, location, resume_skills, linkedin_url, portfolio_url, github_url]
      );
    } else {
      const insertRes = await client.query(
        `
        INSERT INTO profiles (user_id, title, summary, phone, location, resume_skills,
                              linkedin_url, portfolio_url, github_url, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW(), NOW())
        RETURNING id
        `,
        [userId, title, summary, phone, location, resume_skills, linkedin_url, portfolio_url, github_url]
      );
      profileId = insertRes.rows[0].id;
    }

    await client.query('DELETE FROM profile_education WHERE profile_id = $1', [profileId]);
    for (const edu of education) {
      let start_date = edu.start_date || null;
      let end_date = edu.end_date || null;
      if (!start_date && !end_date && (edu.year || edu.period)) {
        const y = parseInt(edu.year, 10) || null;
        if (y) end_date = new Date(y, 11, 1);
        if (edu.period && typeof edu.period === 'string') {
          const m = edu.period.match(/(\d{4})/g);
          if (m && m[0]) start_date = start_date || new Date(parseInt(m[0], 10), 0, 1);
          if (m && m[1]) end_date = new Date(parseInt(m[1], 10), 11, 1);
        }
      }
      await client.query(
        `
        INSERT INTO profile_education (profile_id, degree, field_of_study, institution, start_date, end_date, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          profileId,
          edu.degree ?? null,
          edu.field_of_study ?? null,
          edu.institution ?? null,
          start_date,
          end_date,
          edu.description ?? null,
        ]
      );
    }

    await client.query('DELETE FROM profile_work_experience WHERE profile_id = $1', [profileId]);
    const workList = professional.workExperience || [];
    for (const w of workList) {
      const { start_date, end_date, is_current } = w.start_date != null
        ? { start_date: w.start_date, end_date: w.end_date, is_current: w.is_current === true }
        : parsePeriod(w.period);
      await client.query(
        `
        INSERT INTO profile_work_experience (profile_id, company_name, job_title, start_date, end_date, is_current, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          profileId,
          w.company ?? null,
          w.role ?? null,
          start_date,
          end_date,
          is_current,
          w.description ?? null,
        ]
      );
    }

    await client.query('COMMIT');
    return { success: true, profileId };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export { toBuilderProfile, parsePeriod };
