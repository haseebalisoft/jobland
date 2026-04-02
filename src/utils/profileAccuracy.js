/**
 * ATS-oriented profile completeness (0–100). Same rules as Profile builder.
 */
export function computeProfileAccuracy(profile) {
  const missing = [];
  let score = 0;

  const personal = profile?.personal || {};
  const professional = profile?.professional || {};
  const education = profile?.education || [];
  const workExperience = professional?.workExperience || [];
  const skills = Array.isArray(professional?.skills) ? professional.skills : [];
  const links = profile?.links || {};

  if ((personal.fullName || '').trim().length >= 2) score += 8;
  else missing.push({ label: 'Full name', tab: 'Personal' });
  if ((personal.email || '').trim().length >= 5) score += 8;
  else missing.push({ label: 'Email', tab: 'Personal' });
  if ((personal.phone || '').trim().length >= 6) score += 4;
  else missing.push({ label: 'Phone', tab: 'Personal' });
  if ((personal.location || '').trim().length >= 2) score += 5;
  else missing.push({ label: 'Location', tab: 'Personal' });

  const title = (professional.currentTitle || '').trim();
  if (title.length >= 2) score += 15;
  else missing.push({ label: 'Professional title', tab: 'Personal' });

  const summary = (professional.summary || '').trim();
  if (summary.length >= 150) score += 15;
  else if (summary.length >= 50) score += 10;
  else if (summary.length >= 1) score += 5;
  else missing.push({ label: 'Professional summary', tab: 'Personal' });

  if (workExperience.length === 0) {
    missing.push({ label: 'At least one work experience', tab: 'Work Experience' });
  } else {
    const first = workExperience[0];
    const hasCompany = (first.company || '').trim().length >= 1;
    const hasRole = (first.role || '').trim().length >= 1;
    const hasDescription = (first.description || '').trim().length >= 50;
    if (hasCompany && hasRole && hasDescription) score += 25;
    else if (hasCompany && hasRole) score += 18;
    else if (hasCompany || hasRole) score += 10;
    else missing.push({ label: 'Company & role in work experience', tab: 'Work Experience' });
  }

  if (education.length === 0) {
    missing.push({ label: 'At least one education entry', tab: 'Education' });
  } else {
    const first = education[0];
    const hasDegree = (first.degree || '').trim().length >= 1;
    const hasInstitution = (first.institution || '').trim().length >= 1;
    if (hasDegree && hasInstitution) score += 12;
    else if (hasDegree || hasInstitution) score += 6;
    else missing.push({ label: 'Degree & institution', tab: 'Education' });
  }

  if (skills.length >= 5) score += 6;
  else if (skills.length >= 3) score += 4;
  else if (skills.length >= 1) score += 2;
  else missing.push({ label: 'Add 3+ skills', tab: 'Skills' });

  const hasLink =
    (links.linkedin || '').trim().length >= 10 ||
    (links.portfolio || '').trim().length >= 10 ||
    (links.github || '').trim().length >= 10;
  if (hasLink) score += 2;

  const completionPercent = Math.min(100, Math.round(score));
  return { completionPercent, missingFields: missing };
}
