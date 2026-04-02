/**
 * True when the profile has enough content to compare meaningfully to a JD
 * (not just a name or empty sections). Mirrors backend checks.
 */
export function hasSubstantiveResumeForJobMatch(profile) {
  if (!profile || typeof profile !== 'object') return false;
  const personal = profile.personal || {};
  const prof = profile.professional || {};
  const summary = String(prof.summary || '').trim();
  const skills = Array.isArray(prof.skills) ? prof.skills.filter((s) => String(s).trim().length > 0) : [];
  const work = Array.isArray(prof.workExperience) ? prof.workExperience : [];

  if (work.length >= 1) {
    const w = work[0];
    const desc = String(w.description || '').trim();
    const company = String(w.company || '').trim();
    const role = String(w.role || '').trim();
    if (desc.length >= 50) return true;
    if (company.length >= 1 && role.length >= 1 && desc.length >= 25) return true;
  }
  if (summary.length >= 80) return true;
  if (skills.length >= 5) return true;
  if (skills.length >= 3 && summary.length >= 40) return true;
  if (String(personal.fullName || '').trim().length >= 2 && summary.length >= 120) return true;

  return false;
}

/** Set only after a successful PDF parse (server `resume_uploaded_at`). */
export function hasUploadedResumePdf(profile) {
  const t = profile?.resumeUploadedAt ?? profile?.resume_uploaded_at;
  if (t == null || t === '') return false;
  const s = String(t).trim();
  if (!s || s === 'null' || s === 'undefined') return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

/** Job match is allowed only after PDF upload + enough text to compare. */
export function canMatchJobDescription(profile) {
  return hasUploadedResumePdf(profile) && hasSubstantiveResumeForJobMatch(profile);
}
