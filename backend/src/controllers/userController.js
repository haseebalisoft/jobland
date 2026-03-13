import { query } from '../config/db.js';

export async function saveOnboarding(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      jobFunction,
      jobFunctions = [],
      jobTypes = [],
      preferredLocations = [],
      preferredCity,
      earliestStartDate,
      experienceLevel,
      openToRemote,
      workAuthorisation: workAuthorisationRaw,
      requiresSponsorship, // legacy field, kept for backward compatibility
    } = req.body || {};

    if (
      (!jobFunction && (!Array.isArray(jobFunctions) || jobFunctions.length === 0)) &&
      (!Array.isArray(jobTypes) || jobTypes.length === 0)
    ) {
      return res.status(400).json({ message: 'Onboarding preferences are required' });
    }

    const typeMap = {
      'Full-time': 'full_time',
      Contract: 'contract',
      'Part-time': 'part_time',
      Internship: 'internship',
    };

    const primaryJobTypeLabel =
      Array.isArray(jobTypes) && jobTypes.length > 0 ? jobTypes[0] : null;
    const employmentType = primaryJobTypeLabel
      ? typeMap[primaryJobTypeLabel] || null
      : null;
    const allEmploymentTypes =
      Array.isArray(jobTypes) && jobTypes.length > 0
        ? jobTypes.map((t) => typeMap[t]).filter(Boolean)
        : null;

    const preferredCountry =
      Array.isArray(preferredLocations) && preferredLocations.length > 0
        ? preferredLocations[0]
        : null;

    const preferredCityValue = preferredCity || null;
    const earliestStartDateValue = earliestStartDate || null;
    const remotePreference = openToRemote ? 'remote_only' : null;
    const workAuthorisation =
      workAuthorisationRaw ||
      (requiresSponsorship ? 'requires_sponsorship' : null);

    const levelToYears = {
      Internship: 0,
      Entry: 1,
      Mid: 3,
      Senior: 5,
      Lead: 8,
      Executive: 12,
    };

    const experienceYears =
      experienceLevel && levelToYears[experienceLevel]
        ? levelToYears[experienceLevel]
        : null;

    // Find BD assigned to this user, if any. BD assignment is optional at onboarding time.
    const bdRes = await query(
      `
        SELECT bd_id
        FROM user_bd_assignments
        WHERE user_id = $1
        ORDER BY created_at ASC
        LIMIT 1
      `,
      [userId],
    );

    const bdId = bdRes.rows[0]?.bd_id || null;

    const allJobFunctions =
      Array.isArray(jobFunctions) && jobFunctions.length > 0
        ? jobFunctions
        : jobFunction
        ? [jobFunction]
        : null;
    const primaryJobFunction = allJobFunctions?.[0] || null;

    const existing = await query(
      `
        SELECT id
        FROM profiles
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId],
    );

    if (existing.rowCount > 0) {
      const profileId = existing.rows[0].id;

      await query(
        `
          UPDATE profiles
          SET
            bd_id = $2,
            title = $3,
            employment_type = $4,
            experience_years = $5,
            experience_level = $6,
            earliest_start_date = $7,
            preferred_country = $8,
            preferred_city = $9,
            remote_preference = $10,
            work_authorisation = $11,
            job_functions = $12,
            job_types = $13,
            is_active = TRUE,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          profileId,
          bdId,
          primaryJobFunction || null,
          employmentType,
          experienceYears,
          experienceLevel || null,
          earliestStartDateValue,
          preferredCountry,
          preferredCityValue,
          remotePreference,
          workAuthorisation,
          allJobFunctions,
          allEmploymentTypes,
        ],
      );
    } else {
      await query(
        `
          INSERT INTO profiles (
            user_id,
            bd_id,
            title,
            employment_type,
            experience_years,
            experience_level,
            earliest_start_date,
            preferred_country,
            preferred_city,
            remote_preference,
            work_authorisation,
            job_functions,
            job_types
          )
          VALUES (
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
            $11,
            $12,
            $13
          )
        `,
        [
          userId,
          bdId,
          primaryJobFunction || null,
          employmentType,
          experienceYears,
          experienceLevel || null,
          earliestStartDateValue,
          preferredCountry,
          preferredCityValue,
          remotePreference,
          workAuthorisation,
          allJobFunctions,
          allEmploymentTypes,
        ],
      );
    }

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

