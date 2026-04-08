import pool from '../config/db.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { buildResumePdf } from './pdfService.js';

/**
 * Build the resume-maker format from DB (profiles + profile_education + profile_work_experience + user).
 */
function toBuilderProfile(user, profile, education, workExperience) {
  const personal = {
    fullName: profile?.resume_full_name || user?.full_name || '',
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
  let resumeUploadedAt = null;
  if (profile?.resume_uploaded_at) {
    const d = new Date(profile.resume_uploaded_at);
    resumeUploadedAt = Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return {
    personal,
    professional,
    education: educationList,
    links,
    resumeUploadedAt,
  };
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

/** Matches 001_initial: user_bd_assignments.bd_id → users(id). Some DBs use bds(id) instead. */
let cachedUbaBdFkTarget = null;
/** profiles.bd_id may reference users(id) or bds(id) depending on migrations / manual changes. */
let cachedProfilesBdFkTarget = null;

async function getUserBdAssignmentBdFkTarget(client) {
  if (cachedUbaBdFkTarget) return cachedUbaBdFkTarget;
  try {
    const r = await client.query(
      `SELECT ccu.table_name AS ref_table
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
       WHERE tc.table_schema = 'public'
         AND tc.table_name = 'user_bd_assignments'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'bd_id'`,
    );
    const row = (r.rows || []).find((x) => x.ref_table === 'bds' || x.ref_table === 'users');
    cachedUbaBdFkTarget = row?.ref_table === 'bds' ? 'bds' : 'users';
  } catch {
    cachedUbaBdFkTarget = 'users';
  }
  return cachedUbaBdFkTarget;
}

async function getProfilesBdFkTarget(client) {
  if (cachedProfilesBdFkTarget) return cachedProfilesBdFkTarget;
  try {
    const r = await client.query(
      `SELECT ccu.table_name AS ref_table
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
       WHERE tc.table_schema = 'public'
         AND tc.table_name = 'profiles'
         AND tc.constraint_type = 'FOREIGN KEY'
         AND kcu.column_name = 'bd_id'`,
    );
    const row = (r.rows || []).find((x) => x.ref_table === 'bds' || x.ref_table === 'users');
    cachedProfilesBdFkTarget = row?.ref_table === 'bds' ? 'bds' : 'users';
  } catch {
    cachedProfilesBdFkTarget = 'users';
  }
  return cachedProfilesBdFkTarget;
}

async function bdsPkForBdUser(client, bdUserId) {
  const r = await client.query(`SELECT id FROM bds WHERE user_id = $1::uuid LIMIT 1`, [bdUserId]).catch(() => ({ rows: [] }));
  if (r.rows[0]?.id) return r.rows[0].id;
  const r2 = await client.query(`SELECT id FROM bds WHERE id = $1::uuid LIMIT 1`, [bdUserId]).catch(() => ({ rows: [] }));
  return r2.rows[0]?.id || null;
}

async function bdUserIdFromUbaBdId(client, ubaBdId, ubaTarget) {
  if (!ubaBdId) return null;
  if (ubaTarget === 'users') return ubaBdId;
  const r = await client.query(`SELECT user_id FROM bds WHERE id = $1::uuid LIMIT 1`, [ubaBdId]).catch(() => ({ rows: [] }));
  const uid = r.rows[0]?.user_id;
  if (!uid) return null;
  const chk = await client.query(`SELECT id FROM users WHERE id = $1::uuid AND role = 'bd' AND is_active = TRUE`, [uid]);
  return chk.rows[0]?.id || null;
}

/**
 * Resolves IDs for a new profile row + optional user_bd_assignments insert.
 * 001_initial: profiles.bd_id → users; user_bd_assignments.bd_id → users; assigned_by → users.
 * If your DB references public.bds for either column, values are mapped accordingly.
 * assigned_by is always a real users.id (never a bds PK).
 */
async function resolveBdContextForProfileInsert(client, userId) {
  const ubaTarget = await getUserBdAssignmentBdFkTarget(client);
  const profileTarget = await getProfilesBdFkTarget(client);

  const assignedBdRes = await client.query(
    `SELECT bd_id FROM user_bd_assignments WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [userId],
  );

  let bdUserId = await bdUserIdFromUbaBdId(client, assignedBdRes.rows[0]?.bd_id, ubaTarget);

  if (!bdUserId) {
    const fallbackBdRes = await client.query(
      `SELECT id FROM users WHERE role = 'bd' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1`,
    );
    bdUserId = fallbackBdRes.rows[0]?.id || null;
  }

  if (!bdUserId) return null;

  let ubaBdId = bdUserId;
  if (ubaTarget === 'bds') {
    ubaBdId = await bdsPkForBdUser(client, bdUserId);
    if (!ubaBdId) {
      const anyBds = await client.query(`SELECT id FROM bds ORDER BY id ASC LIMIT 1`).catch(() => ({ rows: [] }));
      ubaBdId = anyBds.rows[0]?.id || null;
    }
  }

  let profileBdId = bdUserId;
  if (profileTarget === 'bds') {
    profileBdId = await bdsPkForBdUser(client, bdUserId);
    if (!profileBdId) {
      const anyBds = await client.query(`SELECT id FROM bds ORDER BY id ASC LIMIT 1`).catch(() => ({ rows: [] }));
      profileBdId = anyBds.rows[0]?.id || null;
    }
  }

  if (!ubaBdId || !profileBdId) return null;

  return {
    bdUserId,
    ubaBdId,
    profileBdId,
    assignedByUserId: bdUserId,
  };
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
           linkedin_url, portfolio_url, github_url, resume_full_name, resume_uploaded_at
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
export async function saveResumeProfile(userId, builderProfile, options = {}) {
  const { markResumeParsed = false } = options;
  const { personal = {}, professional = {}, education = [], links = {} } = builderProfile;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let profileRow = await client.query(
      'SELECT id FROM profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    let profileId = profileRow.rows[0]?.id;

    const resume_full_name = personal.fullName ?? null;
    const title = professional.currentTitle ?? '';
    const summary = professional.summary ?? null;
    const phone = personal.phone ?? null;
    const location = personal.location ?? null;
    const resume_skills = Array.isArray(professional.skills) ? professional.skills : [];
    const linkedin_url = links.linkedin ?? null;
    const portfolio_url = links.portfolio ?? null;
    const github_url = links.github ?? null;

    if (profileId) {
      if (markResumeParsed) {
        await client.query(
          `
          UPDATE profiles
          SET title = $2, summary = $3, phone = $4, location = $5,
              resume_skills = $6, linkedin_url = $7, portfolio_url = $8, github_url = $9,
              resume_full_name = $10, resume_uploaded_at = NOW(), updated_at = NOW()
          WHERE id = $1
          `,
          [profileId, title, summary, phone, location, resume_skills, linkedin_url, portfolio_url, github_url, resume_full_name]
        );
      } else {
        await client.query(
          `
          UPDATE profiles
          SET title = $2, summary = $3, phone = $4, location = $5,
              resume_skills = $6, linkedin_url = $7, portfolio_url = $8, github_url = $9,
              resume_full_name = $10, updated_at = NOW()
          WHERE id = $1
          `,
          [profileId, title, summary, phone, location, resume_skills, linkedin_url, portfolio_url, github_url, resume_full_name]
        );
      }
    } else {
      const ctx = await resolveBdContextForProfileInsert(client, userId);

      if (!ctx) {
        const err = new Error('Cannot create profile: no BD user available for assignment');
        err.statusCode = 503;
        throw err;
      }

      await client.query(
        `
        INSERT INTO user_bd_assignments (user_id, bd_id, assigned_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, bd_id) DO NOTHING
        `,
        [userId, ctx.ubaBdId, ctx.assignedByUserId],
      );

      const insertRes = markResumeParsed
        ? await client.query(
            `
            INSERT INTO profiles (user_id, bd_id, title, summary, phone, location, resume_skills,
                                  linkedin_url, portfolio_url, github_url, resume_full_name, is_active,
                                  resume_uploaded_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, NOW(), NOW(), NOW())
            RETURNING id
            `,
            [userId, ctx.profileBdId, title, summary, phone, location, resume_skills, linkedin_url, portfolio_url, github_url, resume_full_name]
          )
        : await client.query(
            `
            INSERT INTO profiles (user_id, bd_id, title, summary, phone, location, resume_skills,
                                  linkedin_url, portfolio_url, github_url, resume_full_name, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, NOW(), NOW())
            RETURNING id
            `,
            [userId, ctx.profileBdId, title, summary, phone, location, resume_skills, linkedin_url, portfolio_url, github_url, resume_full_name]
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

const SAVED_RESUMES_UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'saved-resumes');

async function keepOnlyAvailableSavedResumes(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const checks = await Promise.all(
    rows.map(async (row) => {
      const absolutePath = path.join(process.cwd(), 'uploads', row.storage_key || '');
      try {
        await fs.access(absolutePath);
        return row;
      } catch {
        return null;
      }
    }),
  );
  return checks.filter(Boolean);
}

export async function saveFinalizedResume(userId, title, profile, actor) {
  if (!title || !String(title).trim()) {
    const err = new Error('title is required');
    err.statusCode = 400;
    throw err;
  }
  if (!profile || typeof profile !== 'object') {
    const err = new Error('profile is required');
    err.statusCode = 400;
    throw err;
  }

  const pdfBuffer = await buildResumePdf(profile, {});
  await fs.mkdir(SAVED_RESUMES_UPLOAD_ROOT, { recursive: true });
  const fileName = `${randomUUID()}.pdf`;
  const relativeStorageKey = path.posix.join('saved-resumes', fileName);
  const absolutePath = path.join(process.cwd(), 'uploads', relativeStorageKey);
  await fs.writeFile(absolutePath, pdfBuffer);

  try {
    const result = await pool.query(
      `
        INSERT INTO saved_resumes (
          id,
          user_id,
          title,
          profile_snapshot_json,
          storage_key,
          original_filename,
          source,
          created_by,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3::jsonb,
          $4,
          $5,
          $6::resume_source_type,
          $7,
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id, user_id, title, source, created_at
      `,
      [
        userId,
        String(title).trim(),
        JSON.stringify(profile),
        relativeStorageKey,
        `${String(title).trim().replace(/\s+/g, '_') || 'resume'}.pdf`,
        actor?.role === 'bd' ? 'bd_provided' : 'user_provided',
        actor?.id || userId,
      ],
    );
    return result.rows[0];
  } catch (err) {
    await fs.unlink(absolutePath).catch(() => {});
    throw err;
  }
}

export async function listSavedResumesForUser(userId) {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        title,
        profile_snapshot_json,
        storage_key,
        original_filename,
        source,
        created_at,
        updated_at
      FROM saved_resumes
      WHERE user_id = $1
        AND is_active = TRUE
      ORDER BY created_at DESC
    `,
    [userId],
  );
  return keepOnlyAvailableSavedResumes(result.rows || []);
}

export async function listSavedResumesForBdUser(bdId, userId) {
  const access = await pool.query(
    `
      SELECT 1
      FROM user_bd_assignments
      WHERE bd_id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [bdId, userId],
  );
  if (access.rowCount === 0) {
    const err = new Error('You can only access resumes of users assigned to you');
    err.statusCode = 403;
    throw err;
  }

  return listSavedResumesForUser(userId);
}

export async function getSavedResumeById(savedResumeId) {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        title,
        storage_key,
        original_filename,
        source
      FROM saved_resumes
      WHERE id = $1
        AND is_active = TRUE
      LIMIT 1
    `,
    [savedResumeId],
  );
  return result.rows[0] || null;
}

/** Owner snapshot for resume editor (profile JSON stored with saved PDF). */
export async function getSavedResumeSnapshotForUser(savedResumeId, userId) {
  const result = await pool.query(
    `
      SELECT id, title, profile_snapshot_json
      FROM saved_resumes
      WHERE id = $1
        AND user_id = $2
        AND is_active = TRUE
      LIMIT 1
    `,
    [savedResumeId, userId],
  );
  return result.rows[0] || null;
}

export async function getSavedResumeFileForActor(savedResumeId, actor) {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        storage_key,
        original_filename
      FROM saved_resumes
      WHERE id = $1
        AND is_active = TRUE
      LIMIT 1
    `,
    [savedResumeId],
  );
  if (result.rowCount === 0) {
    const err = new Error('Saved resume not found');
    err.statusCode = 404;
    throw err;
  }
  const row = result.rows[0];
  if (!actor) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }
  const isOwnerUser = actor.role === 'user' && actor.id === row.user_id;
  const isAdmin = actor.role === 'admin';
  let isAssignedBd = false;
  if (actor.role === 'bd') {
    const access = await pool.query(
      `
        SELECT 1
        FROM user_bd_assignments
        WHERE bd_id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [actor.id, row.user_id],
    );
    isAssignedBd = access.rowCount > 0;
  }
  if (!isOwnerUser && !isAdmin && !isAssignedBd) {
    const err = new Error('Not authorized to access this saved resume');
    err.statusCode = 403;
    throw err;
  }

  const absolutePath = path.join(process.cwd(), 'uploads', row.storage_key);
  try {
    await fs.access(absolutePath);
  } catch {
    const err = new Error('Saved resume file is missing from storage');
    err.statusCode = 404;
    throw err;
  }
  return {
    absolutePath,
    fileName: row.original_filename || 'resume.pdf',
    mimeType: 'application/pdf',
  };
}

/**
 * Save a user-uploaded PDF as a saved resume version (no builder profile snapshot).
 */
export async function saveUploadedSavedResume(userId, title, file, actor) {
  if (!title || !String(title).trim()) {
    const err = new Error('title is required');
    err.statusCode = 400;
    throw err;
  }
  if (!file || file.mimetype !== 'application/pdf') {
    const err = new Error('Only PDF files are allowed');
    err.statusCode = 400;
    throw err;
  }

  const pdfBuffer = file.buffer;
  await fs.mkdir(SAVED_RESUMES_UPLOAD_ROOT, { recursive: true });
  const fileName = `${randomUUID()}.pdf`;
  const relativeStorageKey = path.posix.join('saved-resumes', fileName);
  const absolutePath = path.join(process.cwd(), 'uploads', relativeStorageKey);
  await fs.writeFile(absolutePath, pdfBuffer);

  const snapshot = {
    kind: 'uploaded_pdf',
    originalFilename: file.originalname || 'resume.pdf',
  };

  try {
    const result = await pool.query(
      `
        INSERT INTO saved_resumes (
          id,
          user_id,
          title,
          profile_snapshot_json,
          storage_key,
          original_filename,
          source,
          created_by,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3::jsonb,
          $4,
          $5,
          $6::resume_source_type,
          $7,
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id, user_id, title, source, created_at
      `,
      [
        userId,
        String(title).trim(),
        JSON.stringify(snapshot),
        relativeStorageKey,
        file.originalname || 'resume.pdf',
        actor?.role === 'bd' ? 'bd_provided' : 'user_provided',
        actor?.id || userId,
      ],
    );
    return result.rows[0];
  } catch (err) {
    await fs.unlink(absolutePath).catch(() => {});
    throw err;
  }
}

/**
 * Permanently remove a saved resume owned by the user. Deletes the DB row (application_resumes.saved_resume_id is set NULL by FK) and removes the file from disk.
 */
export async function deleteSavedResumeForUser(savedResumeId, actor) {
  if (!actor || actor.role !== 'user') {
    const err = new Error('Only account owners can delete saved resumes');
    err.statusCode = 403;
    throw err;
  }
  if (!savedResumeId) {
    const err = new Error('saved resume id is required');
    err.statusCode = 400;
    throw err;
  }

  const del = await pool.query(
    `
      DELETE FROM saved_resumes
      WHERE id = $1
        AND user_id = $2
      RETURNING storage_key
    `,
    [savedResumeId, actor.id],
  );
  if (del.rowCount === 0) {
    const err = new Error('Saved resume not found');
    err.statusCode = 404;
    throw err;
  }
  const storageKey = del.rows[0]?.storage_key;
  if (storageKey) {
    const absolutePath = path.join(process.cwd(), 'uploads', storageKey);
    await fs.unlink(absolutePath).catch(() => {});
  }
  return { success: true };
}

export { toBuilderProfile, parsePeriod };
