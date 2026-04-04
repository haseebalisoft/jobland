/** Client-side resume completeness score (no API). */
export function computeResumeScore(profile) {
  if (!profile) return { total: 0, breakdown: {} };
  let pts = 0;
  const breakdown = {};

  const p = profile.personal || {};
  const contactOk = !!(p.email && p.phone && p.location);
  breakdown.contact = { ok: contactOk, points: contactOk ? 15 : 0 };
  pts += breakdown.contact.points;

  const sum = (profile.professional?.summary || '').trim();
  const sumOk = sum.length > 40;
  breakdown.summary = { ok: sumOk, points: sumOk ? 20 : 0 };
  pts += breakdown.summary.points;

  const work = profile.professional?.workExperience || [];
  const workOk = work.length > 0 && work.some((w) => (w.description || '').trim().length > 20);
  breakdown.work = { ok: workOk, count: work.length, points: workOk ? 25 : Math.min(10, work.length * 3) };
  pts += breakdown.work.points;

  const skills = profile.professional?.skills || [];
  const skillsOk = skills.length >= 3;
  breakdown.skills = { ok: skillsOk, points: skillsOk ? 15 : Math.min(8, skills.length * 2) };
  pts += breakdown.skills.points;

  const edu = profile.education || [];
  const eduOk = edu.length > 0;
  breakdown.education = { ok: eduOk, points: eduOk ? 15 : 0 };
  pts += breakdown.education.points;

  const proj = profile.professional?.projects || [];
  breakdown.projects = { ok: proj.length > 0, points: proj.length > 0 ? 5 : 0 };
  pts += breakdown.projects.points;

  const total = Math.min(100, Math.round(pts));
  return { total, breakdown };
}

export const FONT_OPTIONS = [
  { value: "'Times New Roman', Times, serif", label: 'Times New Roman' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: 'Calibri, sans-serif', label: 'Calibri' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Open Sans', sans-serif", label: 'Open Sans' },
  { value: "'Lato', sans-serif", label: 'Lato' },
];

export function paperToPx(paperSize) {
  if (paperSize === 'letter') return { width: 816, minHeight: 1056 };
  return { width: 794, minHeight: 1123 };
}
