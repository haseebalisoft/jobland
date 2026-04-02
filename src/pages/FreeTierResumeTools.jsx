import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Upload,
  Sparkles,
  Zap,
  Loader2,
  Target,
  Layers,
  ListChecks,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import UserSidebar from '../components/UserSidebar.jsx';
import UpgradeFloatPanel from '../components/UpgradeFloatPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { normalizeProfile, emptyProfile } from '../utils/cvProfile.js';
import { computeProfileAccuracy } from '../utils/profileAccuracy.js';
import { isFreePlanUser } from '../utils/subscription.js';
import {
  canMatchJobDescription,
  hasSubstantiveResumeForJobMatch,
  hasUploadedResumePdf,
} from '../utils/jobMatchEligibility.js';

const shell = {
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  background: '#fff',
  boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
  overflow: 'hidden',
};

const tealAccent = '#0d9488';
const tealMuted = '#0f766e';
const tealSurface = '#f0fdfa';
const tealBorder = '#99f6e4';

/** Primary teal actions — matches “Get match score” / theme */
const btnTealPrimary = {
  border: 'none',
  background: `linear-gradient(90deg, ${tealAccent}, #14b8a6)`,
  color: 'white',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 1px 3px rgba(13, 148, 136, 0.35)',
};

const btnOutlineTeal = {
  border: `1px solid ${tealAccent}`,
  background: '#fff',
  color: tealMuted,
  fontWeight: 700,
  cursor: 'pointer',
};

const LAST_RESUME_FILENAME_KEY = 'hiredlogics_last_resume_pdf_name';

function safeAtsScore(v) {
  const n = Number(v);
  if (Number.isFinite(n)) return Math.round(Math.min(100, Math.max(0, n)));
  return null;
}

export default function FreeTierResumeTools() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const atsImproveSectionRef = useRef(null);
  const [activeTab, setActiveTab] = useState('scorer');
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [syncingProfile, setSyncingProfile] = useState(false);
  const [file, setFile] = useState(null);
  /** Shown after a successful parse + when returning with a saved resume (sessionStorage). */
  const [lastUploadedResumeFileName, setLastUploadedResumeFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  const [jd, setJd] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedData, setAnalyzedData] = useState(null);
  const [analyzeError, setAnalyzeError] = useState('');

  const [atsAnalysis, setAtsAnalysis] = useState(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState('');
  const showUpgradePanel = searchParams.get('upgrade') === '1';

  const closeUpgradePanel = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('upgrade');
      next.delete('from');
      return next;
    }, { replace: true });
  };

  const runAtsAnalysis = async (p) => {
    setAtsLoading(true);
    setAtsError('');
    try {
      let data;
      try {
        ({ data } = await api.post('/cv/ats-analysis', { profile: p }));
      } catch (first) {
        if (first.response?.status === 404) {
          ({ data } = await api.post('/cv/atsanalysis', { profile: p }));
        } else {
          throw first;
        }
      }
      setAtsAnalysis(data);
    } catch (err) {
      setAtsError(err.response?.data?.error || err.message || 'ATS analysis failed.');
      setAtsAnalysis(null);
    } finally {
      setAtsLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    setSyncingProfile(true);
    try {
      const res = await api.get('/cv/profile');
      setProfile(normalizeProfile(res.data));
      return true;
    } catch {
      return false;
    } finally {
      setSyncingProfile(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/cv/profile')
      .then((res) => {
        if (!cancelled) setProfile(normalizeProfile(res.data));
      })
      .catch(() => {
        if (!cancelled) setProfile(emptyProfile());
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'matcher' || loadingProfile) return;
    refreshProfile();
  }, [activeTab, loadingProfile, refreshProfile]);

  useEffect(() => {
    if (loadingProfile) return;
    try {
      const stored = sessionStorage.getItem(LAST_RESUME_FILENAME_KEY);
      if (stored && stored.trim()) setLastUploadedResumeFileName(stored.trim());
    } catch {
      /* ignore */
    }
  }, [loadingProfile, profile?.resumeUploadedAt]);

  const profileAccuracy = useMemo(
    () => (profile ? computeProfileAccuracy(profile) : { completionPercent: 0, missingFields: [] }),
    [profile]
  );

  const handleParseUpload = async () => {
    if (!file) return;
    const uploadedName = file.name || 'resume.pdf';
    setParsing(true);
    setParseError('');
    setAtsError('');
    const formData = new FormData();
    formData.append('resume', file);
    try {
      await api.post('/cv/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fresh = await api.get('/cv/profile');
      const normalized = normalizeProfile(fresh.data);
      setProfile(normalized);
      setLastUploadedResumeFileName(uploadedName);
      try {
        sessionStorage.setItem(LAST_RESUME_FILENAME_KEY, uploadedName);
      } catch {
        /* ignore */
      }
      setFile(null);
      await runAtsAnalysis(normalized);
    } catch (err) {
      const code = err.response?.data?.code;
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (code === 'RATE_LIMIT' ? 'AI service is busy. Try again in a minute.' : null) ||
        'Could not read or parse this PDF. Try another file or check that the PDF has selectable text.';
      setParseError(msg);
    } finally {
      setParsing(false);
    }
  };

  const scrollToAtsImproveSection = () => {
    atsImproveSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleImproveFromMatch = () => {
    if (user && !isFreePlanUser(user)) {
      if (typeof window !== 'undefined' && jd.trim()) {
        window.sessionStorage.setItem('resume_maker_seed_jd', jd.trim());
      }
      navigate('/resume-maker');
      return;
    }
    setActiveTab('scorer');
    setTimeout(() => {
      scrollToAtsImproveSection();
    }, 80);
  };

  const hasProfileBody = (p) =>
    !!p &&
    ((p.personal?.fullName || '').trim().length > 0 ||
      (p.professional?.workExperience?.length ?? 0) > 0 ||
      (p.professional?.summary || '').trim().length > 0);

  const handleAnalyzeJD = async () => {
    setAnalyzeError('');
    if (syncingProfile) {
      setAnalyzeError('Wait for your profile to finish syncing, then try again.');
      return;
    }
    if (!jd.trim()) {
      setAnalyzeError('Paste a job description first.');
      return;
    }
    const p = profile || emptyProfile();
    if (!hasUploadedResumePdf(p)) {
      setAnalyzeError(
        'Upload a resume PDF on the “Upload resume” tab first. Matching uses the text we extract from that file — not a blank or manually-only profile.'
      );
      return;
    }
    if (!hasSubstantiveResumeForJobMatch(p)) {
      setAnalyzeError(
        'Your parsed resume is too thin to compare. Re-upload a clearer PDF or add roles and bullets in Profile.'
      );
      return;
    }

    setIsAnalyzing(true);
    setAnalyzeError('');
    setAnalyzedData(null);
    const runMatch = async () => {
      let gapAnalysis;
      try {
        const res = await api.post('/cv/job-match', { jd });
        gapAnalysis = res.data.gapAnalysis;
      } catch (firstErr) {
        if (firstErr.response?.status === 404) {
          const res = await api.post('/cv/optimize-full-resume', { jd });
          gapAnalysis = res.data.gapAnalysis;
        } else {
          throw firstErr;
        }
      }
      return gapAnalysis;
    };
    try {
      let gapAnalysis = await runMatch();
      setAnalyzedData({ gapAnalysis });
    } catch (err) {
      if (err.response?.data?.code === 'RESUME_NOT_UPLOADED') {
        await refreshProfile();
        try {
          const gapAnalysis = await runMatch();
          setAnalyzedData({ gapAnalysis });
          setAnalyzeError('');
        } catch (e2) {
          const msg = e2.response?.data?.error || e2.message || 'Analysis failed.';
          setAnalyzeError(msg);
          setAnalyzedData(null);
        }
      } else {
        const msg = err.response?.data?.error || err.message || 'Analysis failed.';
        setAnalyzeError(msg);
        setAnalyzedData(null);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const gap = analyzedData?.gapAnalysis;

  const stuffingStyles = {
    low: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    medium: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    high: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  };

  const tabBtn = (id, label, Icon) => {
    const on = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(id)}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 10px',
          fontSize: 14,
          lineHeight: 1.25,
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
          background: on ? tealSurface : 'transparent',
          color: on ? tealMuted : '#64748b',
          borderBottom: on ? `3px solid ${tealAccent}` : '3px solid transparent',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <Icon size={20} style={{ color: on ? tealAccent : '#94a3b8' }} />
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <UpgradeFloatPanel open={showUpgradePanel} onClose={closeUpgradePanel} />
      <UserSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', marginLeft: 0 }}>
        {loadingProfile ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 48,
              gap: 16,
            }}
          >
            <Loader2 className="animate-spin" size={40} style={{ color: tealAccent }} aria-hidden />
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#64748b' }}>Loading Groq/API…</p>
          </div>
        ) : (
        <main style={{ flex: 1, padding: '28px 24px 48px', maxWidth: 900, width: '100%', margin: '0 auto' }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Resume &amp; job match</h1>
          <p style={{ color: '#64748b', marginBottom: 24, fontSize: 15, lineHeight: 1.5 }}>
            Upload a resume for an <strong>ATS-style analysis</strong> (keywords, impact, structure), or paste a job description to see
            how your experience lines up.
          </p>

          <div style={shell}>
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #e2e8f0',
                background: '#fafafa',
              }}
            >
              {tabBtn('scorer', 'Upload resume', Upload)}
              {tabBtn('matcher', 'Match resume to JD', Target)}
            </div>

            <div style={{ padding: 24 }}>
              {activeTab === 'scorer' && (
                <>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
                    <Upload size={20} color={tealAccent} /> Upload resume (PDF)
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
                    <strong>Give yourself a stronger shot at interviews.</strong> Most employers screen resumes with software (ATS) before a human
                    reads them. Upload your PDF and we&apos;ll analyze how well your resume reads for those systems and for real recruiters:
                    keyword fit for your role, clear impact and numbers, and a structure that&apos;s easy to scan. You&apos;ll get concrete
                    strengths, gaps, and next steps so you can optimize your resume and improve your odds of moving forward.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    {(file?.name || lastUploadedResumeFileName) && (
                      <span
                        title={file?.name || lastUploadedResumeFileName}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#0f172a',
                          maxWidth: 'min(100%, 320px)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          padding: '6px 10px',
                          borderRadius: 8,
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {file?.name ? (
                          <>
                            <span style={{ color: '#64748b', fontWeight: 600 }}>Selected: </span>
                            {file.name}
                          </>
                        ) : (
                          <>
                            <span style={{ color: '#64748b', fontWeight: 600 }}>Last upload: </span>
                            {lastUploadedResumeFileName}
                          </>
                        )}
                      </span>
                    )}
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      disabled={parsing || atsLoading}
                      onChange={(e) => {
                        const nextFile = e.target.files?.[0] || null;
                        setFile(nextFile);
                        if (nextFile?.name) {
                          setLastUploadedResumeFileName(nextFile.name);
                          try {
                            sessionStorage.setItem(LAST_RESUME_FILENAME_KEY, nextFile.name);
                          } catch {
                            /* ignore */
                          }
                        }
                        setParseError('');
                      }}
                    />
                    <button type="button" className="btn-next" disabled={!file || parsing || atsLoading} onClick={handleParseUpload}>
                      {parsing ? (
                        <>
                          <Loader2 className="animate-spin" size={16} style={{ marginRight: 8 }} />
                          Reading PDF…
                        </>
                      ) : (
                        'Upload & analyze'
                      )}
                    </button>
                    {!loadingProfile && profile && hasProfileBody(profile) && (
                      <button
                        type="button"
                        className="logout-btn"
                        style={{ fontSize: 13, fontWeight: 600 }}
                        disabled={atsLoading || parsing}
                        onClick={() => runAtsAnalysis(profile)}
                      >
                        {atsLoading ? 'Analyzing…' : 'Re-run ATS analysis'}
                      </button>
                    )}
                  </div>
                  {atsLoading && (
                    <p style={{ color: tealMuted, fontSize: 14, marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Loader2 className="animate-spin" size={16} aria-hidden />
                      Running ATS analysis…
                    </p>
                  )}
                  {parseError && <p style={{ color: '#dc2626', fontSize: 14, marginTop: 12 }}>{parseError}</p>}
                  {atsError && (
                    <div style={{ marginTop: 16, padding: 12, background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                      <p style={{ color: '#991b1b', fontSize: 14, margin: 0 }}>{atsError}</p>
                      {!loadingProfile && profile && hasProfileBody(profile) && (
                        <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0 0' }}>
                          Basic checklist fallback: {profileAccuracy.completionPercent}% — fields missing:{' '}
                          {profileAccuracy.missingFields?.slice(0, 5).map((f) => f.label).join(', ') || 'none'}
                        </p>
                      )}
                    </div>
                  )}

                  {!loadingProfile && profile && hasProfileBody(profile) && atsAnalysis && (
                    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div
                        style={{
                          padding: 20,
                          background: tealSurface,
                          borderRadius: 12,
                          border: `1px solid ${tealBorder}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: tealMuted, textTransform: 'uppercase' }}>Overall ATS score</div>
                            <div style={{ fontSize: 40, fontWeight: 900, color: tealAccent, lineHeight: 1.1 }}>
                              {safeAtsScore(atsAnalysis.overallAtsScore) != null ? `${safeAtsScore(atsAnalysis.overallAtsScore)}%` : '—'}
                            </div>
                            <p style={{ fontSize: 14, color: '#334155', margin: '12px 0 0', lineHeight: 1.55 }}>
                              {atsAnalysis.executiveSummary || 'No summary returned — try Re-run ATS analysis.'}
                            </p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch', minWidth: 200 }}>
                            <button
                              type="button"
                              onClick={scrollToAtsImproveSection}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                padding: '10px 14px',
                                borderRadius: 10,
                                fontSize: 14,
                                ...btnTealPrimary,
                              }}
                            >
                              <TrendingUp size={18} />
                              Improve score
                            </button>
                            {user && !isFreePlanUser(user) && (
                              <button
                                type="button"
                                onClick={() => navigate('/resume-maker')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 8,
                                  padding: '10px 14px',
                                  borderRadius: 10,
                                  fontSize: 14,
                                  ...btnOutlineTeal,
                                }}
                              >
                                Open resume builder
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div ref={atsImproveSectionRef} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {Array.isArray(atsAnalysis.dimensions) && atsAnalysis.dimensions.length > 0 && (
                        <div style={{ padding: 20, background: '#fff', borderRadius: 12, border: `1px solid ${tealBorder}` }}>
                          <h3 style={{ fontSize: 14, fontWeight: 800, color: tealMuted, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Layers size={18} /> Dimension scores (weighted)
                          </h3>
                          {atsAnalysis.dimensions.map((d, idx) => {
                            if (!d || typeof d !== 'object') return null;
                            const pct = Math.min(100, Math.max(0, Number(d.score) || 0));
                            const w = d.weightPercent ?? '';
                            return (
                              <div key={d.id || d.label || `dim-${idx}`} style={{ marginBottom: 18 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 }}>
                                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{d.label}</span>
                                  <span style={{ fontSize: 12, color: '#64748b' }}>
                                    {w ? `${w}% weight · ` : ''}
                                    {pct}%
                                  </span>
                                </div>
                                <div style={{ height: 8, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${tealAccent}, #2dd4bf)` }} />
                                </div>
                                {(d.highlights?.length > 0 || d.gaps?.length > 0) && (
                                  <div style={{ marginTop: 8, fontSize: 13, color: '#475569', display: 'grid', gap: 6 }}>
                                    {d.highlights?.length > 0 && (
                                      <div>
                                        <span style={{ fontWeight: 700, color: tealMuted }}>Strengths: </span>
                                        {d.highlights.join(' · ')}
                                      </div>
                                    )}
                                    {d.gaps?.length > 0 && (
                                      <div>
                                        <span style={{ fontWeight: 700, color: '#c2410c' }}>Gaps: </span>
                                        {d.gaps.join(' · ')}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {atsAnalysis.keywordAnalysis && (
                        <div style={{ padding: 20, background: '#fff', borderRadius: 12, border: `1px solid ${tealBorder}` }}>
                          <h3 style={{ fontSize: 14, fontWeight: 800, color: tealMuted, margin: '0 0 12px' }}>Keyword analysis</h3>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Stuffing risk:</span>
                            {(() => {
                              const r = String(atsAnalysis.keywordAnalysis.stuffingRisk || 'low').toLowerCase();
                              const st = stuffingStyles[r] || stuffingStyles.low;
                              return (
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 800,
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    background: st.bg,
                                    color: st.color,
                                    border: `1px solid ${st.border}`,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {r}
                                </span>
                              );
                            })()}
                          </div>
                          {atsAnalysis.keywordAnalysis.notes && (
                            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 12px' }}>{atsAnalysis.keywordAnalysis.notes}</p>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                            <div>
                              <div style={{ fontWeight: 700, color: tealMuted, marginBottom: 6 }}>Strong</div>
                              <ul style={{ margin: 0, paddingLeft: 18, color: '#334155' }}>
                                {(atsAnalysis.keywordAnalysis.strongTerms || []).slice(0, 12).map((t, i) => (
                                  <li key={i}>{t}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#c2410c', marginBottom: 6 }}>Missing / weak</div>
                              <ul style={{ margin: 0, paddingLeft: 18, color: '#334155' }}>
                                {(atsAnalysis.keywordAnalysis.missingOrWeak || []).slice(0, 12).map((t, i) => (
                                  <li key={i}>{t}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {atsAnalysis.impactAnalysis && (
                        <div style={{ padding: 20, background: '#fff', borderRadius: 12, border: `1px solid ${tealBorder}` }}>
                          <h3 style={{ fontSize: 14, fontWeight: 800, color: tealMuted, margin: '0 0 8px' }}>Impact & metrics</h3>
                          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                            Score: <strong style={{ color: tealAccent }}>{Math.round(Number(atsAnalysis.impactAnalysis.score) || 0)}</strong>
                            {atsAnalysis.impactAnalysis.hasQuantifiedBullets ? ' · Includes quantified bullets' : ' · Few/no clear metrics'}
                          </p>
                          {(atsAnalysis.impactAnalysis.examples || []).length > 0 && (
                            <div style={{ fontSize: 13, color: '#334155', marginBottom: 8 }}>
                              <span style={{ fontWeight: 700 }}>Examples: </span>
                              {(atsAnalysis.impactAnalysis.examples || []).slice(0, 5).join(' · ')}
                            </div>
                          )}
                          {(atsAnalysis.impactAnalysis.gaps || []).length > 0 && (
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#475569' }}>
                              {(atsAnalysis.impactAnalysis.gaps || []).map((g, i) => (
                                <li key={i}>{g}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {atsAnalysis.structureNotes && (
                        <div style={{ padding: 20, background: '#fff', borderRadius: 12, border: `1px solid ${tealBorder}` }}>
                          <h3 style={{ fontSize: 14, fontWeight: 800, color: tealMuted, margin: '0 0 8px' }}>Structure & ATS parsing</h3>
                          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                            Score: <strong style={{ color: tealAccent }}>{Math.round(Number(atsAnalysis.structureNotes.score) || 0)}</strong>
                          </p>
                          {(atsAnalysis.structureNotes.findings || []).length > 0 && (
                            <ul style={{ margin: '0 0 8px', paddingLeft: 18, fontSize: 13, color: '#334155' }}>
                              {(atsAnalysis.structureNotes.findings || []).map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          )}
                          {(atsAnalysis.structureNotes.parsingRisks || []).length > 0 && (
                            <div style={{ fontSize: 13, color: '#b45309' }}>
                              <strong>Parsing risks:</strong> {(atsAnalysis.structureNotes.parsingRisks || []).join(' · ')}
                            </div>
                          )}
                        </div>
                      )}

                      {Array.isArray(atsAnalysis.recommendations) && atsAnalysis.recommendations.length > 0 && (
                        <div id="ats-recommendations" style={{ padding: 20, background: '#fff', borderRadius: 12, border: `1px solid ${tealBorder}` }}>
                          <h3 style={{ fontSize: 14, fontWeight: 800, color: tealMuted, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ListChecks size={18} /> Recommendations
                          </h3>
                          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', fontSize: 14, color: '#334155' }}>
                            {atsAnalysis.recommendations.map((rec, i) => {
                              if (!rec) return null;
                              const pr = String(rec.priority || 'medium').toLowerCase();
                              const col = pr === 'high' ? '#b91c1c' : pr === 'low' ? '#64748b' : '#b45309';
                              return (
                                <li key={i} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: `3px solid ${col}` }}>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: col, textTransform: 'uppercase' }}>{pr}</span>
                                  {' — '}
                                  {rec.text || '(No text)'}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'matcher' && (
                <>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
                    <Sparkles size={20} color={tealAccent} /> Paste a job posting
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
                    Paste a job description. We compare it to <strong>the resume text from your uploaded PDF</strong> (first tab).
                  </p>
                  {profile && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: tealSurface,
                        border: `1px solid ${tealBorder}`,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 800, color: tealMuted, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        Resume used for this match
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 6, lineHeight: 1.35 }}>
                        {(profile.professional?.currentTitle || '').trim() || '—'}
                        {!hasUploadedResumePdf(profile) && (
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309', marginLeft: 8 }}>
                            (upload a PDF on the first tab to match)
                          </span>
                        )}
                      </div>
                      {(profile.personal?.fullName || '').trim() ? (
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{(profile.personal.fullName || '').trim()}</div>
                      ) : null}
                      {profile.resumeUploadedAt ? (
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                          From saved upload ·{' '}
                          {(() => {
                            try {
                              return new Date(profile.resumeUploadedAt).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              });
                            } catch {
                              return '';
                            }
                          })()}
                        </div>
                      ) : null}
                    </div>
                  )}
                  {syncingProfile && (
                    <p
                      style={{
                        marginBottom: 12,
                        fontSize: 13,
                        color: tealMuted,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Loader2 className="animate-spin" size={16} aria-hidden />
                      Syncing saved resume from the server…
                    </p>
                  )}
                  {profile && !syncingProfile && !hasUploadedResumePdf(profile) && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 14,
                        borderRadius: 10,
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        fontSize: 14,
                        color: '#92400e',
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>No resume PDF on record yet.</strong> On the first tab, use &quot;Upload &amp; analyze&quot; so we parse and
                      save your file. Job match uses that saved parse — not profile text typed elsewhere alone.
                      <div style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          disabled={syncingProfile}
                          onClick={() => refreshProfile()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 12px',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 700,
                            ...btnOutlineTeal,
                          }}
                        >
                          <RefreshCw size={14} />
                          Refresh status
                        </button>
                      </div>
                    </div>
                  )}
                  {profile && !syncingProfile && hasUploadedResumePdf(profile) && !hasSubstantiveResumeForJobMatch(profile) && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 14,
                        borderRadius: 10,
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        fontSize: 14,
                        color: '#92400e',
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>Parsed resume is too thin.</strong> Re-upload a clearer PDF or add roles and detail in Profile so there is
                      enough text to compare to the job description.
                    </div>
                  )}
                  <textarea
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    placeholder="Paste the job description here…"
                    style={{
                      width: '100%',
                      minHeight: 140,
                      padding: 12,
                      borderRadius: 10,
                      border: `1px solid ${tealBorder}`,
                      background: '#fff',
                      color: '#0f172a',
                      fontSize: 14,
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAnalyzeJD}
                    disabled={isAnalyzing || syncingProfile || !canMatchJobDescription(profile || emptyProfile())}
                    style={{
                      marginTop: 14,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '12px 16px',
                      borderRadius: 10,
                      cursor: isAnalyzing ? 'wait' : 'pointer',
                      opacity: isAnalyzing ? 0.9 : 1,
                      ...btnTealPrimary,
                    }}
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                    {isAnalyzing ? 'Analyzing…' : 'Get match score'}
                  </button>
                  {analyzeError && <p style={{ color: '#dc2626', marginTop: 12, fontSize: 14 }}>{analyzeError}</p>}

                  {gap && (
                    <div
                      style={{
                        marginTop: 24,
                        padding: 20,
                        background: tealSurface,
                        borderRadius: 12,
                        border: `1px solid ${tealBorder}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: tealMuted, textTransform: 'uppercase' }}>Job match score</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <span
                            style={{
                              padding: '6px 14px',
                              background: '#fff',
                              color: tealMuted,
                              border: `1px solid ${tealBorder}`,
                              borderRadius: 999,
                              fontWeight: 800,
                              fontSize: 14,
                            }}
                          >
                            {safeAtsScore(gap.alignmentScore) != null ? `${safeAtsScore(gap.alignmentScore)}%` : '—%'} match
                          </span>
                          <button
                            type="button"
                            onClick={handleImproveFromMatch}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 12px',
                              borderRadius: 8,
                              fontSize: 13,
                              ...btnTealPrimary,
                            }}
                          >
                            <TrendingUp size={15} />
                            Improve match
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div
                          style={{
                            padding: 14,
                            background: '#fff',
                            borderRadius: 10,
                            textAlign: 'center',
                            border: `1px solid ${tealBorder}`,
                          }}
                        >
                          <div style={{ fontSize: 24, fontWeight: 900, color: tealAccent }}>{gap.matchedKeywords?.length ?? 0}</div>
                          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Matched keywords</div>
                        </div>
                        <div
                          style={{
                            padding: 14,
                            background: '#fff7ed',
                            borderRadius: 10,
                            textAlign: 'center',
                            border: '1px solid #fed7aa',
                          }}
                        >
                          <div style={{ fontSize: 24, fontWeight: 900, color: '#c2410c' }}>{gap.missingKeywords?.length ?? 0}</div>
                          <div style={{ fontSize: 11, color: '#9a3412', fontWeight: 700, textTransform: 'uppercase' }}>Not matched</div>
                        </div>
                      </div>

                      {gap.analysis && (
                        <p
                          style={{
                            fontSize: 14,
                            color: '#334155',
                            lineHeight: 1.55,
                            margin: '0 0 16px',
                            padding: 12,
                            background: '#fff',
                            borderRadius: 10,
                            border: `1px solid ${tealBorder}`,
                          }}
                        >
                          {gap.analysis}
                        </p>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 16,
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            flex: '1 1 260px',
                            minWidth: 0,
                            padding: 14,
                            background: '#fff',
                            borderRadius: 10,
                            border: `1px solid ${tealBorder}`,
                            minHeight: 80,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: tealMuted,
                              marginBottom: 10,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <CheckCircle2 size={18} color={tealAccent} aria-hidden />
                            What matched (JD ↔ resume)
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {(gap.matchedKeywords || []).map((k, i) => (
                              <span
                                key={`m-${i}`}
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  padding: '5px 10px',
                                  borderRadius: 8,
                                  background: '#ecfdf5',
                                  color: '#047857',
                                  border: '1px solid #a7f3d0',
                                }}
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                          {(!gap.matchedKeywords || gap.matchedKeywords.length === 0) && (
                            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No specific matches listed — try a fuller resume or JD.</p>
                          )}
                        </div>

                        <div
                          style={{
                            flex: '1 1 260px',
                            minWidth: 0,
                            padding: 14,
                            background: '#fff',
                            borderRadius: 10,
                            border: '1px solid #fed7aa',
                            minHeight: 80,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: '#9a3412',
                              marginBottom: 10,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <XCircle size={18} color="#ea580c" aria-hidden />
                            What didn&apos;t match (add or strengthen)
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {(gap.missingKeywords || []).map((k, i) => (
                              <span
                                key={`x-${i}`}
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  padding: '5px 10px',
                                  borderRadius: 8,
                                  background: '#fff7ed',
                                  color: '#9a3412',
                                  border: '1px solid #fdba74',
                                }}
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                          {(!gap.missingKeywords || gap.missingKeywords.length === 0) && (
                            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Nothing flagged as missing — strong overlap.</p>
                          )}
                        </div>
                      </div>

                      {((gap.summaryGaps && gap.summaryGaps.length > 0) ||
                        (gap.experienceGaps && gap.experienceGaps.length > 0) ||
                        (gap.skillsGaps && gap.skillsGaps.length > 0)) && (
                        <div style={{ marginBottom: 16, fontSize: 13, color: '#475569' }}>
                          {gap.summaryGaps?.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <span style={{ fontWeight: 800, color: tealMuted }}>Summary: </span>
                              {gap.summaryGaps.join(' · ')}
                            </div>
                          )}
                          {gap.experienceGaps?.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <span style={{ fontWeight: 800, color: tealMuted }}>Experience: </span>
                              {gap.experienceGaps.join(' · ')}
                            </div>
                          )}
                          {gap.skillsGaps?.length > 0 && (
                            <div>
                              <span style={{ fontWeight: 800, color: tealMuted }}>Skills: </span>
                              {gap.skillsGaps.join(' · ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
        )}
      </div>
    </div>
  );
}
