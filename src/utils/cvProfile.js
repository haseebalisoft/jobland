export const emptyProfile = () => ({
  personal: { fullName: '', email: '', phone: '', location: '' },
  professional: {
    currentTitle: '',
    summary: '',
    skills: [],
    workExperience: [],
    projects: [],
    awards: [],
    certifications: [],
  },
  education: [],
  links: { linkedin: '', github: '', portfolio: '' },
  resumeUploadedAt: null,
});

function pickResumeUploadedAt(raw) {
  const v = raw?.resumeUploadedAt ?? raw?.resume_uploaded_at ?? raw?.meta?.resumeUploadedAt;
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (!s || s === 'null' || s === 'undefined') return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function normalizeProfile(data) {
  if (!data) return emptyProfile();
  return {
    personal: { ...emptyProfile().personal, ...(data.personal || {}) },
    professional: {
      ...emptyProfile().professional,
      ...(data.professional || {}),
      skills: Array.isArray(data.professional?.skills) ? data.professional.skills : [],
      workExperience: Array.isArray(data.professional?.workExperience) ? data.professional.workExperience : [],
      projects: Array.isArray(data.professional?.projects) ? data.professional.projects : [],
      awards: Array.isArray(data.professional?.awards) ? data.professional.awards : [],
      certifications: Array.isArray(data.professional?.certifications) ? data.professional.certifications : [],
    },
    education: Array.isArray(data.education) ? data.education : [],
    links: { ...emptyProfile().links, ...(data.links || {}) },
    resumeUploadedAt: pickResumeUploadedAt(data),
  };
}
