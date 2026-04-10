import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Upload,
  Sparkles,
  Zap,
  Loader2,
  Target,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
  FileUp,
  AlertTriangle,
} from 'lucide-react';
import UpgradeFloatPanel from '../components/UpgradeFloatPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { normalizeProfile, emptyProfile } from '../utils/cvProfile.js';
import { computeProfileAccuracy } from '../utils/profileAccuracy.js';
import { isPaywallBlocking } from '../utils/subscription.js';
import {
  canMatchJobDescription,
  hasSubstantiveResumeForJobMatch,
  hasUploadedResumePdf,
} from '../utils/jobMatchEligibility.js';
import './FreeTierResumeTools.css';

const tealAccent = '#0d9488';
const tealMuted = '#0f766e';
const tealSurface = '#f0fdfa';
const tealBorder = '#99f6e4';

const LAST_RESUME_FILENAME_KEY = 'hiredlogics_last_resume_pdf_name';
const LAST_RESUME_EXTRACTED_TEXT_KEY = 'hiredlogics_last_resume_extracted_text';

function tierColorForScore(n) {
  if (n == null || !Number.isFinite(Number(n))) return '#6b7280';
  const v = Number(n);
  if (v > 70) return '#16a34a';
  if (v >= 50) return '#d97706';
  return '#dc2626';
}

function AtsScoreRing({ score, color }) {
  const pct = score == null ? 0 : Math.min(100, Math.max(0, Number(score)));
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="sr-score-ring-svg" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.9s ease' }}
      />
      <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="800" fill={color}>
        {score != null ? Math.round(pct) : '—'}
      </text>
    </svg>
  );
}

function safeAtsScore(v) {
  const n = Number(v);
  if (Number.isFinite(n)) return Math.round(Math.min(100, Math.max(0, n)));
  return null;
}

export default function FreeTierResumeTools() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const displayName = useMemo(() => user?.name || '', [user?.name]);
  const initials = useMemo(() => {
    const n = displayName || '';
    return n
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';
  }, [displayName]);
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
  /** Full PDF text from last successful /cv/parse — sent to ATS so scoring uses the document, not only structured JSON. */
  const [extractedResumeText, setExtractedResumeText] = useState('');

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

  const runAtsAnalysis = async (p, rawTextOverride) => {
    setAtsLoading(true);
    setAtsError('');
    const raw =
      typeof rawTextOverride === 'string' && rawTextOverride.trim().length >= 200
        ? rawTextOverride.trim()
        : extractedResumeText.trim();
    const body =
      raw.length >= 200 ? { profile: p, rawResumeText: raw.slice(0, 120000) } : { profile: p };
    try {
      let data;
      try {
        ({ data } = await api.post('/cv/ats-analysis', body));
      } catch (first) {
        if (first.response?.status === 404) {
          ({ data } = await api.post('/cv/atsanalysis', body));
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
      const extracted = sessionStorage.getItem(LAST_RESUME_EXTRACTED_TEXT_KEY);
      if (extracted && extracted.trim().length >= 200) setExtractedResumeText(extracted.trim());
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
      const parseRes = await api.post('/cv/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const extracted =
        typeof parseRes.data?.extractedText === 'string' ? parseRes.data.extractedText : '';
      setExtractedResumeText(extracted);
      try {
        if (extracted) sessionStorage.setItem(LAST_RESUME_EXTRACTED_TEXT_KEY, extracted);
      } catch {
        /* ignore */
      }
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
      await runAtsAnalysis(normalized, extracted);
    } catch (err) {
      const code = err.response?.data?.code;
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (code === 'AI_PARSE_UNAVAILABLE'
          ? 'AI could not parse this resume right now. Check API keys on the server or try again shortly.'
          : null) ||
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
    if (user && !isPaywallBlocking(user)) {
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
    if (!hasSubstantiveResumeForJobMatch(p)) {
      setAnalyzeError(
        'Add enough resume content to compare (work experience, summary, or skills in Profile / resume builder), or upload a PDF on the Upload tab.'
      );
      return;
    }

    setIsAnalyzing(true);
    setAnalyzeError('');
    setAnalyzedData(null);
    const runMatch = async () => {
      let gapAnalysis;
      try {
        const res = await api.post('/cv/job-match', { jd, profile: p });
        gapAnalysis = res.data.gapAnalysis;
      } catch (firstErr) {
        if (firstErr.response?.status === 404) {
          const res = await api.post('/cv/optimize-full-resume', { jd, profile: p });
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

  const aggregatedHighlights = useMemo(() => {
    const dims = atsAnalysis?.dimensions;
    if (!Array.isArray(dims)) return [];
    const seen = new Set();
    const out = [];
    dims.forEach((d) => {
      (d?.highlights || []).forEach((h) => {
        const t = String(h || '').trim();
        if (t && !seen.has(t)) {
          seen.add(t);
          out.push(t);
        }
      });
    });
    return out;
  }, [atsAnalysis]);

  const aggregatedGapsList = useMemo(() => {
    const dims = atsAnalysis?.dimensions;
    if (!Array.isArray(dims)) return [];
    const seen = new Set();
    const out = [];
    dims.forEach((d) => {
      (d?.gaps || []).forEach((g) => {
        const t = String(g || '').trim();
        if (t && !seen.has(t)) {
          seen.add(t);
          out.push(t);
        }
      });
    });
    return out;
  }, [atsAnalysis]);

  const stuffingStyles = {
    low: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    medium: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    high: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  };

  return (
    <DashboardLayout userName={displayName} userInitials={initials}>
      <div className="sr-page">
      <UpgradeFloatPanel open={showUpgradePanel} onClose={closeUpgradePanel} />
      <div className="sr-scroll">
        {loadingProfile ? (
          <div className="sr-loader-wrap">
            <Loader2 className="animate-spin" size={40} style={{ color: tealAccent }} aria-hidden />
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#64748b' }}>Loading Groq/API…</p>
          </div>
        ) : (
        <main className="sr-main">
          <header className="sr-header">
            <h1 className="sr-title">Resume &amp; job match</h1>
            <p className="sr-subtitle">
              Upload a resume for an <strong>ATS-style analysis</strong> (keywords, impact, structure), or paste a job description
              to see how your experience lines up.
            </p>
          </header>

          <div className="sr-card">
            <div className="sr-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'scorer'}
                className={`sr-tab${activeTab === 'scorer' ? ' sr-tab--active' : ''}`}
                onClick={() => setActiveTab('scorer')}
              >
                <Upload size={18} strokeWidth={2} />
                Upload resume
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'matcher'}
                className={`sr-tab${activeTab === 'matcher' ? ' sr-tab--active' : ''}`}
                onClick={() => setActiveTab('matcher')}
              >
                <Target size={18} strokeWidth={2} />
                Match resume to JD
              </button>
            </div>

            <div className="sr-panel">
              {activeTab === 'scorer' && (
                <>
                  <div className="sr-section-head">
                    <Upload size={20} color={tealAccent} aria-hidden />
                    <h2>Upload resume (PDF)</h2>
                  </div>
                  <div className="sr-desc-card">
                    <span className="sr-desc-lead">Give yourself a stronger shot at interviews.</span>
                    Most employers screen resumes with software (ATS) before a human reads them. Upload your PDF and we&apos;ll analyze how
                    well your resume reads for those systems and for real recruiters: keyword fit for your role, clear impact and numbers,
                    and a structure that&apos;s easy to scan. You&apos;ll get concrete strengths, gaps, and next steps so you can optimize
                    your resume and improve your odds of moving forward.
                  </div>
                  <div className="sr-upload-row">
                    <label className="sr-file-label">
                      <input
                        className="sr-file-input"
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
                      <FileUp size={18} color="#9ca3af" aria-hidden />
                      <span>
                        {file?.name || lastUploadedResumeFileName || 'No file chosen'}
                      </span>
                    </label>
                    <button
                      type="button"
                      className="sr-btn-upload"
                      disabled={!file || parsing || atsLoading}
                      onClick={handleParseUpload}
                    >
                      {parsing ? (
                        <>
                          <Loader2 className="animate-spin" size={16} aria-hidden />
                          Reading PDF…
                        </>
                      ) : (
                        <>
                          <Zap size={16} aria-hidden />
                          Upload &amp; analyze
                        </>
                      )}
                    </button>
                    {!loadingProfile && profile && hasProfileBody(profile) && (
                      <button
                        type="button"
                        className="sr-btn-rerun"
                        disabled={atsLoading || parsing}
                        onClick={() => runAtsAnalysis(profile)}
                      >
                        <RefreshCw size={14} aria-hidden />
                        {atsLoading ? 'Analyzing…' : 'Re-run ATS analysis'}
                      </button>
                    )}
                  </div>
                  {atsLoading && (
                    <div className="sr-loading-inline">
                      <Loader2 className="animate-spin" size={16} aria-hidden />
                      Running ATS analysis…
                    </div>
                  )}
                  {parseError && <p className="sr-error">{parseError}</p>}
                  {atsError && (
                    <div className="sr-error-box">
                      <p>{atsError}</p>
                      {!loadingProfile && profile && hasProfileBody(profile) && (
                        <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0 0' }}>
                          Basic checklist fallback: {profileAccuracy.completionPercent}% — fields missing:{' '}
                          {profileAccuracy.missingFields?.slice(0, 5).map((f) => f.label).join(', ') || 'none'}
                        </p>
                      )}
                    </div>
                  )}

                  {!loadingProfile && profile && hasProfileBody(profile) && atsAnalysis && (
                    <div className="sr-ats-stack">
                      {(() => {
                        const overallScore = safeAtsScore(atsAnalysis.overallAtsScore);
                        const overallColor = tierColorForScore(overallScore);
                        return (
                          <div className="sr-score-hero">
                            <div className="sr-score-hero-inner">
                              <div>
                                <div className="sr-score-label">Your ATS Score</div>
                                <div className="sr-score-big">
                                  <span className="sr-score-num" style={{ color: overallColor }}>
                                    {overallScore != null ? overallScore : '—'}
                                  </span>
                                  <span className="sr-score-denom">/100</span>
                                </div>
                              </div>
                              <AtsScoreRing score={overallScore} color={overallColor} />
                            </div>
                            <p className="sr-score-summary">
                              {atsAnalysis.executiveSummary || 'No summary returned — try Re-run ATS analysis.'}
                            </p>
                            <div className="sr-improve-row">
                              <button type="button" className="sr-btn-improve" onClick={scrollToAtsImproveSection}>
                                <TrendingUp size={18} aria-hidden />
                                Improve score
                              </button>
                              {user && !isPaywallBlocking(user) && (
                                <button type="button" className="sr-btn-outline-t" onClick={() => navigate('/resume-maker')}>
                                  Open resume builder
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {Array.isArray(atsAnalysis.dimensions) && atsAnalysis.dimensions.length > 0 && (
                        <div ref={atsImproveSectionRef} className="sr-breakdown-grid">
                          {atsAnalysis.dimensions.map((d, idx) => {
                            if (!d || typeof d !== 'object') return null;
                            const pct = Math.min(100, Math.max(0, Number(d.score) || 0));
                            const w = d.weightPercent ?? '';
                            const dimCol = tierColorForScore(pct);
                            const bullets = [];
                            const h = d.highlights || [];
                            const g = d.gaps || [];
                            if (h[0]) bullets.push(h[0]);
                            if (h[1]) bullets.push(h[1]);
                            if (bullets.length < 2 && g[0]) bullets.push(g[0]);
                            if (bullets.length < 2 && g[1]) bullets.push(g[1]);
                            const two = bullets.slice(0, 2);
                            return (
                              <div key={d.id || d.label || `dim-${idx}`} className="sr-dim-card">
                                <div className="sr-dim-head">
                                  <span className="sr-dim-title">{d.label}</span>
                                  <span
                                    className="sr-dim-badge"
                                    style={{
                                      background: `${dimCol}18`,
                                      color: dimCol,
                                      border: `1px solid ${dimCol}44`,
                                    }}
                                  >
                                    {pct}%
                                  </span>
                                </div>
                                <div className="sr-mini-bar">
                                  <div className="sr-mini-fill" style={{ width: `${pct}%`, background: dimCol }} />
                                </div>
                                {two.length > 0 && (
                                  <ul className="sr-dim-bullets">
                                    {two.map((line, li) => (
                                      <li key={li}>{line}</li>
                                    ))}
                                  </ul>
                                )}
                                {w ? (
                                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9ca3af' }}>{w}% weight</p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {(aggregatedHighlights.length > 0 || aggregatedGapsList.length > 0) && (
                        <div className="sr-sg-grid">
                          <div className="sr-sg-col sr-sg-col--str">
                            <h3>
                              <CheckCircle2 size={18} strokeWidth={2.5} aria-hidden />
                              Strengths
                            </h3>
                            <div className="sr-pill-list">
                              {aggregatedHighlights.slice(0, 12).map((t, i) => (
                                <div key={`str-${i}`} className="sr-pill sr-pill--str">
                                  <CheckCircle2 size={16} color="#16a34a" aria-hidden />
                                  <span>{t}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="sr-sg-col sr-sg-col--gap">
                            <h3>
                              <AlertTriangle size={18} strokeWidth={2.5} aria-hidden />
                              Areas to Improve
                            </h3>
                            <div className="sr-pill-list">
                              {aggregatedGapsList.slice(0, 12).map((t, i) => (
                                <div key={`gap-${i}`} className="sr-pill sr-pill--gap">
                                  <AlertTriangle size={16} color="#d97706" aria-hidden />
                                  <span>{t}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {Array.isArray(atsAnalysis.recommendations) && atsAnalysis.recommendations.length > 0 && (
                        <div className="sr-next" id="ats-recommendations">
                          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: '#111827' }}>Next steps</h3>
                          <ul className="sr-next-list">
                            {atsAnalysis.recommendations.map((rec, i) => {
                              if (!rec) return null;
                              const pr = String(rec.priority || 'medium').toLowerCase();
                              return (
                                <li key={i} className="sr-next-item">
                                  <span className="sr-next-num">{i + 1}</span>
                                  <div className="sr-next-text">
                                    <strong>{rec.text || '(No text)'}</strong>
                                    <span>
                                      {pr === 'high' ? 'High priority' : pr === 'low' ? 'Lower priority' : 'Medium priority'}
                                    </span>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                          <div className="sr-next-footer">
                            <button type="button" className="sr-btn-report" onClick={() => window.print()}>
                              Download full report
                            </button>
                          </div>
                        </div>
                      )}

                      {atsAnalysis.keywordAnalysis && (
                        <div className="sr-extra">
                          <h3>Keyword analysis</h3>
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
                          <div className="sr-extra-grid">
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
                        <div className="sr-extra">
                          <h3>Impact & metrics</h3>
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
                        <div className="sr-extra">
                          <h3>Structure & ATS parsing</h3>
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
                    </div>
                  )}
                </>
              )}

              {activeTab === 'matcher' && (
                <>
                  <div className="sr-section-head">
                    <Sparkles size={20} color={tealAccent} aria-hidden />
                    <h2>Paste a job posting</h2>
                  </div>
                  <p className="sr-matcher-sub">
                    Paste a job description. We compare it to your <strong>current resume profile</strong> (from the resume builder, Profile, or a PDF upload on the first tab).
                  </p>
                  {profile && (
                    <div className="sr-resume-used">
                      <div className="sr-resume-used-label">Resume used for this match</div>
                      <div className="sr-resume-used-row">
                        {hasSubstantiveResumeForJobMatch(profile) || hasUploadedResumePdf(profile) ? (
                          (profile.professional?.currentTitle || '').trim() ||
                            (profile.personal?.fullName || '').trim() ||
                            '—'
                        ) : (
                          <>— (add experience / summary in Profile, or upload a PDF)</>
                        )}
                      </div>
                      {(profile.personal?.fullName || '').trim() ? (
                        <div className="sr-resume-name">{(profile.personal.fullName || '').trim()}</div>
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
                    <div className="sr-loading-inline" style={{ marginBottom: 12 }}>
                      <Loader2 className="animate-spin" size={16} aria-hidden />
                      Syncing saved resume from the server…
                    </div>
                  )}
                  {profile && !syncingProfile && !hasUploadedResumePdf(profile) && !hasSubstantiveResumeForJobMatch(profile) && (
                    <div className="sr-warn-card">
                      <p style={{ margin: 0 }}>
                        <strong>Not enough resume text to compare yet.</strong> Add roles and detail in Profile (or the resume builder), or on
                        the first tab use &quot;Upload &amp; analyze&quot; so we parse and save your file.
                      </p>
                      <button
                        type="button"
                        className="sr-btn-refresh"
                        disabled={syncingProfile}
                        onClick={() => refreshProfile()}
                      >
                        <RefreshCw size={14} aria-hidden />
                        Refresh status
                      </button>
                    </div>
                  )}
                  {profile && !syncingProfile && hasUploadedResumePdf(profile) && !hasSubstantiveResumeForJobMatch(profile) && (
                    <div className="sr-thin-warn">
                      <strong>Parsed resume is too thin.</strong> Re-upload a clearer PDF or add roles and detail in Profile so there is
                      enough text to compare to the job description.
                    </div>
                  )}
                  <textarea
                    className="sr-jd-input"
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    placeholder="Paste the job description here..."
                  />
                  <button
                    type="button"
                    className="sr-btn-match"
                    onClick={handleAnalyzeJD}
                    disabled={isAnalyzing || syncingProfile || !canMatchJobDescription(profile || emptyProfile())}
                    style={{ cursor: isAnalyzing ? 'wait' : undefined }}
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Zap size={18} aria-hidden />}
                    {isAnalyzing ? 'Analyzing…' : 'Get match score'}
                  </button>
                  {analyzeError && <p style={{ color: '#dc2626', marginTop: 12, fontSize: 14 }}>{analyzeError}</p>}

                  {gap && (
                    <div className="sr-gap-hero">
                      <div className="sr-gap-actions" style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
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
                          <button type="button" className="sr-btn-improve" onClick={handleImproveFromMatch}>
                            <TrendingUp size={15} aria-hidden />
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
    </DashboardLayout>
  );
}
