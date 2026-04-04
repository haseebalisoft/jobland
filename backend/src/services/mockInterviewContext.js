import { query } from '../config/db.js';

/**
 * Profile + education summary for mock interview system prompts.
 */
export async function loadInterviewUserContext(userId) {
  const userRes = await query(
    `SELECT id, full_name, email, subscription_plan FROM users WHERE id = $1`,
    [userId],
  );
  if (userRes.rowCount === 0) return null;
  const u = userRes.rows[0];

  const profRes = await query(
    `
      SELECT
        p.id,
        p.title,
        p.summary,
        p.experience_years,
        p.experience_level,
        p.resume_skills,
        p.job_functions,
        p.linkedin_url
      FROM profiles p
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
      LIMIT 1
    `,
    [userId],
  );

  const profile = profRes.rows[0] || null;
  let education = [];
  if (profile?.id) {
    const eduRes = await query(
      `SELECT degree, field_of_study, institution, end_date FROM profile_education WHERE profile_id = $1 ORDER BY end_date DESC NULLS LAST LIMIT 5`,
      [profile.id],
    );
    education = eduRes.rows || [];
  }

  const name = String(u.full_name || '').trim();
  const skills = Array.isArray(profile?.resume_skills)
    ? profile.resume_skills.filter(Boolean)
    : [];
  const jobFns = Array.isArray(profile?.job_functions)
    ? profile.job_functions.filter(Boolean)
    : [];

  const eduSummary = education
    .map((e) =>
      [e.degree, e.field_of_study, e.institution].filter(Boolean).join(' — '),
    )
    .filter(Boolean)
    .join('; ');

  const isPremium =
    u.subscription_plan && String(u.subscription_plan).toLowerCase() !== 'free';

  return {
    name,
    email: u.email,
    currentRole: profile?.title || '',
    targetRole: jobFns[0] || profile?.title || '',
    yearsExp: profile?.experience_years ?? null,
    experienceLevel: profile?.experience_level || '',
    skills,
    jobFunctions: jobFns,
    education: eduSummary,
    summary: profile?.summary || '',
    linkedinUrl: profile?.linkedin_url || null,
    linkedinSummary: profile?.summary || '',
    isPremium,
  };
}
