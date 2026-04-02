import pool, { query } from '../config/db.js';
import { sendEmail } from '../utils/email.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getSavedResumeById } from './cvService.js';
import { getResumeProfile } from './cvService.js';
import { buildResumePdf } from './pdfService.js';

const ALLOWED_APPLICATION_STATUSES = new Set([
  'applied',
  'interview',
  'acceptance',
  'rejection',
  'withdrawn',
]);

const ALLOWED_RESUME_SOURCES = new Set(['user_provided', 'bd_provided']);
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'application-resumes');

function mapApplicationToAssignmentStatus(appStatus, hasAssignedUser) {
  switch (appStatus) {
    case 'applied':
      return hasAssignedUser ? 'assigned' : 'pending';
    case 'interview':
      return 'assigned';
    case 'acceptance':
    case 'rejection':
      return 'completed';
    case 'withdrawn':
      return 'failed';
    default:
      return null;
  }
}

export async function updateApplicationStatus(applicationId, newStatus, actor) {
  if (!ALLOWED_APPLICATION_STATUSES.has(newStatus)) {
    const err = new Error('Invalid application status');
    err.statusCode = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const appRes = await client.query(
      `
        SELECT
          a.id,
          a.user_id,
          a.job_id,
          a.bd_id,
          a.current_status
        FROM applications a
        WHERE a.id = $1
        FOR UPDATE
      `,
      [applicationId],
    );

    if (appRes.rowCount === 0) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    const app = appRes.rows[0];

    // Optional: enforce that only related BD or admin can change
    if (actor.role === 'bd' && actor.id !== app.bd_id) {
      const err = new Error('You can only update your own applications');
      err.statusCode = 403;
      throw err;
    }

    await client.query(
      `
        UPDATE applications
        SET current_status = $2,
            last_status_updated_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `,
      [applicationId, newStatus],
    );

    await client.query(
      `
        INSERT INTO application_status_logs (application_id, old_status, new_status, changed_by)
        VALUES ($1, $2, $3, $4)
      `,
      [applicationId, app.current_status, newStatus, actor.id],
    );

    const jaRes = await client.query(
      `
        SELECT id, user_id
        FROM job_assignments
        WHERE job_id = $1 AND bd_id = $2
        LIMIT 1
      `,
      [app.job_id, app.bd_id],
    );

    if (jaRes.rowCount > 0) {
      const assignment = jaRes.rows[0];
      const hasAssignedUser = !!assignment.user_id;
      const mappedStatus = mapApplicationToAssignmentStatus(newStatus, hasAssignedUser);
      if (mappedStatus) {
        await client.query(
          `
            UPDATE job_assignments
            SET status = $2,
                updated_at = NOW()
            WHERE id = $1
          `,
          [assignment.id, mappedStatus],
        );
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertInterview(applicationId, payload, actor) {
  const {
    mode,
    interview_date,
    interview_time,
    duration_minutes,
    timezone,
    link,
    notes,
  } = payload || {};

  const appRes = await query(
    `
      SELECT
        a.id,
        a.job_id,
        a.bd_id,
        a.user_id,
        u.full_name AS user_full_name,
        u.email AS user_email,
        j.title AS job_title,
        j.company_name,
        ja.id AS job_assignment_id
      FROM applications a
      JOIN users u ON u.id = a.user_id
      JOIN jobs j ON j.id = a.job_id
      LEFT JOIN job_assignments ja
        ON ja.job_id = a.job_id
       AND ja.bd_id = a.bd_id
      WHERE a.id = $1
    `,
    [applicationId],
  );

  if (appRes.rowCount === 0) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  const app = appRes.rows[0];
  if (actor.role === 'bd' && actor.id !== app.bd_id) {
    const err = new Error('You can only add interviews for your own applications');
    err.statusCode = 403;
    throw err;
  }

  const existing = await query(
    'SELECT id FROM interviews WHERE application_id = $1 LIMIT 1',
    [applicationId],
  );

  let interviewId;

  if (existing.rowCount > 0) {
    await query(
      `
        UPDATE interviews
        SET mode = $2,
            interview_date = $3,
            interview_time = $4,
            duration_minutes = $5,
            timezone = $6,
            link = $7,
            notes = $8,
            job_assignment_id = $9,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        existing.rows[0].id,
        mode || null,
        interview_date || null,
        interview_time || null,
        duration_minutes || null,
        timezone || null,
        link || null,
        notes || null,
        app.job_assignment_id || null,
      ],
    );
    interviewId = existing.rows[0].id;
  }

  if (!interviewId) {
    const insertRes = await query(
      `
        INSERT INTO interviews (
          id,
          application_id,
          job_assignment_id,
          mode,
          interview_date,
          interview_time,
          duration_minutes,
          timezone,
          link,
          notes,
          created_by,
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
          $10,
          NOW(),
          NOW()
        )
        RETURNING id
      `,
      [
        applicationId,
        app.job_assignment_id || null,
        mode || null,
        interview_date || null,
        interview_time || null,
        duration_minutes || null,
        timezone || null,
        link || null,
        notes || null,
        actor.id,
      ],
    );

    interviewId = insertRes.rows[0].id;
  }

  // Fire-and-forget interview confirmation email to user
  if (app.user_email) {
    const whenParts = [];
    if (interview_date) whenParts.push(interview_date);
    if (interview_time) whenParts.push(interview_time);
    const whenLabel = whenParts.join(' at ');

    const safeJobTitle = app.job_title || 'your upcoming interview';
    const safeCompany = app.company_name || '';

    const tzLabel = timezone ? ` (${timezone})` : '';

    const html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="font-size: 20px; margin-bottom: 8px;">Congratulations! An interview has been scheduled 🎉</h2>
        <p>Hi ${app.user_full_name || ''},</p>
        <p>
          Great news – your BD just scheduled an interview for <strong>${safeJobTitle}</strong>${safeCompany ? ` at <strong>${safeCompany}</strong>` : ''}.
        </p>
        <div style="margin: 16px 0; padding: 12px 14px; border-radius: 12px; background: #eff6ff; border: 1px solid #bfdbfe;">
          ${whenLabel ? `<div><strong>Date &amp; time:</strong> ${whenLabel}${tzLabel}</div>` : ''}
          ${mode ? `<div><strong>Mode:</strong> ${mode.replace('_', ' ')}</div>` : ''}
          ${duration_minutes ? `<div><strong>Duration:</strong> ${duration_minutes} minutes</div>` : ''}
          ${link ? `<div><strong>Join link:</strong> <a href="${link}" target="_blank" rel="noreferrer">${link}</a></div>` : ''}
        </div>
        ${notes ? `<p><strong>Notes from your BD:</strong><br/>${notes}</p>` : ''}
        <p>
          You can always see these details from your HiredLogics dashboard under Applications and in your Recent activity.
        </p>
        <p style="margin-top: 16px;">Best of luck!<br/>HiredLogics</p>
      </div>
    `;

    // Do not block on email failures
    sendEmail({
      to: app.user_email,
      subject: 'Interview scheduled via HiredLogics',
      html,
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to send interview email:', err?.message || err);
    });
  }

  return interviewId;
}

export async function getInterview(applicationId, actor) {
  const res = await query(
    `
      SELECT
        i.id,
        i.mode,
        i.interview_date,
        i.interview_time,
        i.duration_minutes,
        i.timezone,
        i.link,
        i.notes,
        i.created_by,
        i.created_at,
        i.updated_at
      FROM interviews i
      WHERE i.application_id = $1
      LIMIT 1
    `,
    [applicationId],
  );

  if (res.rowCount === 0) return null;
  return res.rows[0];
}

async function getApplicationWithAccess(applicationId, actor) {
  const appRes = await query(
    `
      SELECT
        a.id,
        a.user_id,
        a.bd_id
      FROM applications a
      WHERE a.id = $1
      LIMIT 1
    `,
    [applicationId],
  );

  if (appRes.rowCount === 0) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  const app = appRes.rows[0];
  const isAdmin = actor.role === 'admin';
  const isOwnerBd = actor.role === 'bd' && actor.id === app.bd_id;
  const isOwnerUser = actor.role === 'user' && actor.id === app.user_id;
  if (!isAdmin && !isOwnerBd && !isOwnerUser) {
    const err = new Error('Not authorized for this application');
    err.statusCode = 403;
    throw err;
  }

  return app;
}

function assertResumeFile(file) {
  if (!file) {
    const err = new Error('resume file is required');
    err.statusCode = 400;
    throw err;
  }
  if (file.mimetype !== 'application/pdf') {
    const err = new Error('Only PDF files are allowed');
    err.statusCode = 400;
    throw err;
  }
}

export async function upsertApplicationResume(applicationId, file, source, actor) {
  await getApplicationWithAccess(applicationId, actor);
  if (!ALLOWED_RESUME_SOURCES.has(source)) {
    const err = new Error('source must be user_provided or bd_provided');
    err.statusCode = 400;
    throw err;
  }
  assertResumeFile(file);

  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  const storageFileName = `${randomUUID()}.pdf`;
  const relativeStorageKey = path.posix.join('application-resumes', storageFileName);
  const absolutePath = path.join(process.cwd(), 'uploads', relativeStorageKey);
  await fs.writeFile(absolutePath, file.buffer);

  const client = await pool.connect();
  let previousStorageKey = null;
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `
        SELECT id, storage_key
        FROM application_resumes
        WHERE application_id = $1
        FOR UPDATE
      `,
      [applicationId],
    );

    if (existing.rowCount > 0) {
      previousStorageKey = existing.rows[0].storage_key || null;
      await client.query(
        `
          UPDATE application_resumes
          SET storage_key = $2,
              original_filename = $3,
              mime_type = $4,
              size_bytes = $5,
              source = $6,
              uploaded_by = $7,
              updated_at = NOW()
          WHERE application_id = $1
        `,
        [
          applicationId,
          relativeStorageKey,
          file.originalname || 'resume.pdf',
          file.mimetype || 'application/pdf',
          file.size || null,
          source,
          actor.id,
        ],
      );
    } else {
      await client.query(
        `
          INSERT INTO application_resumes (
            id,
            application_id,
            storage_key,
            original_filename,
            mime_type,
            size_bytes,
            source,
            uploaded_by,
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
            NOW(),
            NOW()
          )
        `,
        [
          applicationId,
          relativeStorageKey,
          file.originalname || 'resume.pdf',
          file.mimetype || 'application/pdf',
          file.size || null,
          source,
          actor.id,
        ],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    await fs.unlink(absolutePath).catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  if (previousStorageKey) {
    const oldAbsolutePath = path.join(process.cwd(), 'uploads', previousStorageKey);
    await fs.unlink(oldAbsolutePath).catch(() => {});
  }

  return {
    application_id: applicationId,
    source,
    has_resume: true,
  };
}

export async function getApplicationResume(applicationId, actor) {
  await getApplicationWithAccess(applicationId, actor);

  const res = await query(
    `
      SELECT
        storage_key,
        original_filename,
        mime_type
      FROM application_resumes
      WHERE application_id = $1
      LIMIT 1
    `,
    [applicationId],
  );

  if (res.rowCount === 0) {
    const err = new Error('Resume not found for application');
    err.statusCode = 404;
    throw err;
  }

  const row = res.rows[0];
  const absolutePath = path.join(process.cwd(), 'uploads', row.storage_key);
  try {
    await fs.access(absolutePath);
  } catch {
    const err = new Error('Resume file is missing from storage');
    err.statusCode = 404;
    throw err;
  }
  return {
    absolutePath,
    fileName: row.original_filename || 'resume.pdf',
    mimeType: row.mime_type || 'application/pdf',
  };
}

export async function attachSavedResumeToApplication(applicationId, savedResumeId, actor) {
  const app = await getApplicationWithAccess(applicationId, actor);
  const saved = await getSavedResumeById(savedResumeId);
  if (!saved) {
    const err = new Error('Saved resume not found');
    err.statusCode = 404;
    throw err;
  }

  const isAdmin = actor.role === 'admin';
  const isOwnerBd = actor.role === 'bd' && actor.id === app.bd_id;
  const isOwnerUser = actor.role === 'user' && actor.id === app.user_id;
  if (!isAdmin && !isOwnerBd && !isOwnerUser) {
    const err = new Error('Not authorized for this application');
    err.statusCode = 403;
    throw err;
  }

  if (saved.user_id !== app.user_id) {
    const err = new Error('Saved resume must belong to this application user');
    err.statusCode = 400;
    throw err;
  }

  // Guard against stale DB rows that point to deleted/missing files.
  const savedAbsolutePath = path.join(process.cwd(), 'uploads', saved.storage_key);
  try {
    await fs.access(savedAbsolutePath);
  } catch {
    const err = new Error('Selected saved resume file is unavailable. Re-upload it from Resumes.');
    err.statusCode = 404;
    throw err;
  }

  const source = saved.source === 'bd_provided' ? 'bd_provided' : 'user_provided';
  const existing = await query(
    `
      SELECT id
      FROM application_resumes
      WHERE application_id = $1
      LIMIT 1
    `,
    [applicationId],
  );
  if (existing.rowCount > 0) {
    await query(
      `
        UPDATE application_resumes
        SET saved_resume_id = $2,
            storage_key = $3,
            original_filename = $4,
            mime_type = 'application/pdf',
            size_bytes = NULL,
            source = $5,
            uploaded_by = $6,
            updated_at = NOW()
        WHERE application_id = $1
      `,
      [applicationId, saved.id, saved.storage_key, saved.original_filename || 'resume.pdf', source, actor.id],
    );
  } else {
    await query(
      `
        INSERT INTO application_resumes (
          id,
          application_id,
          saved_resume_id,
          storage_key,
          original_filename,
          mime_type,
          size_bytes,
          source,
          uploaded_by,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          'application/pdf',
          NULL,
          $5,
          $6,
          NOW(),
          NOW()
        )
      `,
      [applicationId, saved.id, saved.storage_key, saved.original_filename || 'resume.pdf', source, actor.id],
    );
  }

  return {
    application_id: applicationId,
    saved_resume_id: saved.id,
    source,
    has_resume: true,
  };
}

export async function attachProfileResumeToApplication(applicationId, actor) {
  const app = await getApplicationWithAccess(applicationId, actor);
  if (actor.role === 'user' && actor.id !== app.user_id) {
    const err = new Error('Only the application owner can attach profile resume');
    err.statusCode = 403;
    throw err;
  }

  const profile = await getResumeProfile(app.user_id);
  if (!profile || typeof profile !== 'object') {
    const err = new Error('No resume profile found for this user');
    err.statusCode = 400;
    throw err;
  }

  const hasCore = String(profile.personal?.fullName || '').trim().length > 0
    || String(profile.professional?.summary || '').trim().length > 0
    || (Array.isArray(profile.professional?.workExperience) && profile.professional.workExperience.length > 0);
  if (!hasCore) {
    const err = new Error('User profile is too empty to generate resume');
    err.statusCode = 400;
    throw err;
  }

  const pdfBuffer = await buildResumePdf(profile, {});
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
  const storageFileName = `${randomUUID()}.pdf`;
  const relativeStorageKey = path.posix.join('application-resumes', storageFileName);
  const absolutePath = path.join(process.cwd(), 'uploads', relativeStorageKey);
  await fs.writeFile(absolutePath, pdfBuffer);

  const existing = await query(
    `
      SELECT id, storage_key
      FROM application_resumes
      WHERE application_id = $1
      LIMIT 1
    `,
    [applicationId],
  );
  const oldStorageKey = existing.rowCount > 0 ? existing.rows[0].storage_key : null;

  if (existing.rowCount > 0) {
    await query(
      `
        UPDATE application_resumes
        SET saved_resume_id = NULL,
            storage_key = $2,
            original_filename = $3,
            mime_type = 'application/pdf',
            size_bytes = $4,
            source = 'bd_provided',
            uploaded_by = $5,
            updated_at = NOW()
        WHERE application_id = $1
      `,
      [
        applicationId,
        relativeStorageKey,
        `${(profile.personal?.fullName || 'resume').replace(/\s+/g, '_')}_profile.pdf`,
        pdfBuffer.length,
        actor.id,
      ],
    );
  } else {
    await query(
      `
        INSERT INTO application_resumes (
          id,
          application_id,
          saved_resume_id,
          storage_key,
          original_filename,
          mime_type,
          size_bytes,
          source,
          uploaded_by,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          $1,
          NULL,
          $2,
          $3,
          'application/pdf',
          $4,
          'bd_provided',
          $5,
          NOW(),
          NOW()
        )
      `,
      [
        applicationId,
        relativeStorageKey,
        `${(profile.personal?.fullName || 'resume').replace(/\s+/g, '_')}_profile.pdf`,
        pdfBuffer.length,
        actor.id,
      ],
    );
  }

  if (oldStorageKey && oldStorageKey !== relativeStorageKey) {
    const oldAbsolutePath = path.join(process.cwd(), 'uploads', oldStorageKey);
    await fs.unlink(oldAbsolutePath).catch(() => {});
  }

  return {
    application_id: applicationId,
    source: 'bd_provided',
    has_resume: true,
  };
}

