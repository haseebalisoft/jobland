import { query } from '../config/db.js';

function splitName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

async function loadProfileRow(userId) {
  const r = await query(
    `
      SELECT id, resume_uploaded_at, linkedin_url, summary
      FROM profiles
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId],
  );
  return r.rows[0] || null;
}

async function countSavedResumes(userId) {
  try {
    const r = await query(
      `SELECT COUNT(*)::int AS c FROM saved_resumes WHERE user_id = $1 AND is_active = TRUE`,
      [userId],
    );
    return r.rows[0]?.c ?? 0;
  } catch (e) {
    if (e?.code === '42P01') return 0;
    throw e;
  }
}

async function getProgressRow(userId) {
  try {
    const r = await query(`SELECT current_step, item_states FROM user_dashboard_progress WHERE user_id = $1`, [
      userId,
    ]);
    return r.rows[0] || null;
  } catch (e) {
    if (e?.code === '42P01') return null;
    throw e;
  }
}

const STEP_ORDER = ['application_materials', 'jobs', 'networking', 'interviews'];

export async function getUserProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const u = await query(
      `
        SELECT u.id, u.full_name, u.email, u.subscription_plan,
               sp.name AS subscription_plan_name
        FROM users u
        LEFT JOIN subscription_plans sp ON sp.plan_id = u.subscription_plan
        WHERE u.id = $1
      `,
      [userId],
    );
    if (u.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const row = u.rows[0];
    const { firstName, lastName } = splitName(row.full_name);
    const plan =
      row.subscription_plan && row.subscription_plan !== 'free' ? 'premium' : 'free';
    res.json({
      id: row.id,
      firstName,
      lastName,
      email: row.email,
      avatar: null,
      plan,
      subscription_plan: row.subscription_plan,
      subscription_plan_name: row.subscription_plan_name || null,
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserPlan(req, res, next) {
  try {
    const userId = req.user.id;
    const u = await query(
      `
        SELECT u.subscription_plan, sp.name AS plan_name
        FROM users u
        LEFT JOIN subscription_plans sp ON sp.plan_id = u.subscription_plan
        WHERE u.id = $1
      `,
      [userId],
    );
    if (u.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const row = u.rows[0];
    const isPremium = row.subscription_plan && row.subscription_plan !== 'free';
    res.json({
      plan: isPremium ? 'premium' : 'free',
      subscription_plan: row.subscription_plan,
      plan_name: row.plan_name || null,
      features: isPremium
        ? ['resume_builder', 'job_tracker', 'interviews', 'priority_support']
        : ['resume_builder', 'limited_exports'],
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserProgress(req, res, next) {
  try {
    const userId = req.user.id;
    const [profile, savedN, prog] = await Promise.all([
      loadProfileRow(userId),
      countSavedResumes(userId),
      getProgressRow(userId),
    ]);

    const computedBase = !!(profile?.resume_uploaded_at) || savedN > 0 || !!(profile?.summary && String(profile.summary).trim());
    const computedLinkedin = !!(profile?.linkedin_url && String(profile.linkedin_url).trim());

    const overrides = prog?.item_states && typeof prog.item_states === 'object' ? prog.item_states : {};
    const baseResume = typeof overrides.base_resume === 'boolean' ? overrides.base_resume : computedBase;
    const linkedin = typeof overrides.linkedin === 'boolean' ? overrides.linkedin : computedLinkedin;

    const items = [
      { id: 'base_resume', label: 'Create A Base Resume', completed: baseResume },
      { id: 'linkedin', label: 'Optimize LinkedIn Profile', completed: linkedin },
    ];
    const completedSteps = items.filter((i) => i.completed).length;
    const totalSteps = items.length;
    const currentStep =
      prog?.current_step && STEP_ORDER.includes(prog.current_step)
        ? prog.current_step
        : 'application_materials';

    res.json({
      currentStep,
      completedSteps,
      totalSteps,
      items,
    });
  } catch (err) {
    next(err);
  }
}

/** Re-fetch progress after PUT — internal reuse */
async function refetchProgressJson(userId) {
  const [profile, savedN, prog] = await Promise.all([
    loadProfileRow(userId),
    countSavedResumes(userId),
    getProgressRow(userId),
  ]);
  const computedBase = !!(profile?.resume_uploaded_at) || savedN > 0 || !!(profile?.summary && String(profile.summary).trim());
  const computedLinkedin = !!(profile?.linkedin_url && String(profile.linkedin_url).trim());
  const overrides = prog?.item_states && typeof prog.item_states === 'object' ? prog.item_states : {};
  const baseResume = typeof overrides.base_resume === 'boolean' ? overrides.base_resume : computedBase;
  const linkedin = typeof overrides.linkedin === 'boolean' ? overrides.linkedin : computedLinkedin;
  const items = [
    { id: 'base_resume', label: 'Create A Base Resume', completed: baseResume },
    { id: 'linkedin', label: 'Optimize LinkedIn Profile', completed: linkedin },
  ];
  const completedSteps = items.filter((i) => i.completed).length;
  const currentStep =
    prog?.current_step && STEP_ORDER.includes(prog.current_step)
      ? prog.current_step
      : 'application_materials';
  return {
    currentStep,
    completedSteps,
    totalSteps: items.length,
    items,
  };
}

export async function putUserProgressItem(req, res, next) {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const completed = req.body?.completed;
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ message: 'completed (boolean) is required' });
    }
    if (!['base_resume', 'linkedin'].includes(itemId)) {
      return res.status(400).json({ message: 'Invalid item id' });
    }

    const prog = await getProgressRow(userId);
    const rawStates = prog?.item_states;
    const prev =
      rawStates && typeof rawStates === 'object' && !Array.isArray(rawStates)
        ? rawStates
        : {};
    const nextStates = { ...prev, [itemId]: completed };

    await query(
      `
        INSERT INTO user_dashboard_progress (user_id, item_states, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          item_states = EXCLUDED.item_states,
          updated_at = NOW()
      `,
      [userId, JSON.stringify(nextStates)],
    );

    const payload = await refetchProgressJson(userId);
    res.json(payload);
  } catch (err) {
    if (err?.code === '42P01') {
      return res.status(503).json({ message: 'Progress storage is not initialized. Run database migration 021_user_dashboard_progress.sql.' });
    }
    next(err);
  }
}

export async function putUserProgressStep(req, res, next) {
  try {
    const userId = req.user.id;
    const { step } = req.body || {};
    if (!step || !STEP_ORDER.includes(String(step))) {
      return res.status(400).json({ message: 'Invalid step' });
    }
    await query(
      `
        INSERT INTO user_dashboard_progress (user_id, current_step, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          current_step = EXCLUDED.current_step,
          updated_at = NOW()
      `,
      [userId, step],
    );
    res.json({ currentStep: step });
  } catch (err) {
    if (err?.code === '42P01') {
      return res.status(503).json({ message: 'Progress storage is not initialized.' });
    }
    next(err);
  }
}

export async function createResumeSession(req, res, next) {
  try {
    const userId = req.user.id;
    const prof = await loadProfileRow(userId);
    res.status(201).json({
      ok: true,
      resumeId: prof?.id || null,
      profileId: prof?.id || null,
      startUrl: '/resume-maker',
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserProfileScore(req, res, next) {
  try {
    const userId = req.user.id;
    const [profile, savedN, jobsRes, appsRes] = await Promise.all([
      loadProfileRow(userId),
      countSavedResumes(userId),
      query(`SELECT COUNT(*)::int AS n FROM user_jobs WHERE user_id = $1`, [userId]).catch((e) =>
        e?.code === '42P01' ? { rows: [{ n: 0 }] } : Promise.reject(e),
      ),
      query(`SELECT COUNT(*)::int AS n FROM applications WHERE user_id = $1`, [userId]).catch((e) =>
        e?.code === '42P01' ? { rows: [{ n: 0 }] } : Promise.reject(e),
      ),
    ]);

    const breakdown = {
      profile: profile ? 30 : 0,
      resume: savedN > 0 || profile?.resume_uploaded_at ? 25 : 0,
      linkedin: profile?.linkedin_url ? 15 : 0,
      jobs: Number(jobsRes.rows?.[0]?.n || 0) > 0 ? 15 : 0,
      applications: Number(appsRes.rows?.[0]?.n || 0) > 0 ? 15 : 0,
    };
    const score = Math.min(100, Object.values(breakdown).reduce((n, v) => n + Number(v), 0));

    res.json({ score, breakdown });
  } catch (err) {
    next(err);
  }
}
