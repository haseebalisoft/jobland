import { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import api from '../../../services/api.js';
import { streamCoverLetter } from '../../../hooks/useStreamCoverLetter.js';

export default function CoverLettersPage() {
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [profileMode, setProfileMode] = useState('manual');
  const [resumeText, setResumeText] = useState('');
  const [resumeId, setResumeId] = useState('');
  const [resumes, setResumes] = useState([]);
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lastId, setLastId] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [modal, setModal] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get('/cover-letters/history', { params: { limit: 50 } });
      setHistory(data.letters || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/resumes');
        if (!cancelled) setResumes(data.resumes || []);
      } catch {
        if (!cancelled) setResumes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = async (e) => {
    e.preventDefault();
    if (!jobTitle.trim() || !companyName.trim() || !jobDescription.trim()) return;
    setGenerating(true);
    setOutput('');
    setError(null);
    setLastId(null);

    const body = {
      jobTitle: jobTitle.trim(),
      companyName: companyName.trim(),
      jobDescription: jobDescription.trim(),
      profileMode,
    };
    if (profileMode === 'manual') body.resumeText = resumeText;
    if (profileMode === 'saved_resume') body.resumeId = resumeId;
    if (profileMode === 'linkedin') body.useLinkedIn = true;

    try {
      await streamCoverLetter(body, {
        onChunk: (c) => setOutput((prev) => prev + c),
        onDone: (meta) => {
          if (meta?.coverLetterId) setLastId(meta.coverLetterId);
          if (meta?.content) setOutput(meta.content);
          loadHistory();
        },
        onError: (msg) => setError(String(msg)),
      });
    } catch (err) {
      setError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const openLetter = async (id) => {
    try {
      const { data } = await api.get(`/cover-letters/${id}`);
      setModal(data);
    } catch (e) {
      window.alert(e?.response?.data?.message || e.message);
    }
  };

  const saveToDocuments = async (id) => {
    setSavingId(id);
    try {
      await api.post(`/cover-letters/${id}/save-to-documents`);
      window.alert('Saved to My Documents.');
    } catch (e) {
      window.alert(e?.response?.data?.message || e.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="am-split">
      <div>
        <form className="am-card" onSubmit={generate}>
          <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>Generate cover letter</h2>
          {error && (
            <div className="am-banner am-banner--warn" role="alert">
              {error}
            </div>
          )}
          <div className="am-form-row">
            <label htmlFor="cl-job">Job title</label>
            <input id="cl-job" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
          </div>
          <div className="am-form-row">
            <label htmlFor="cl-co">Company</label>
            <input id="cl-co" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </div>
          <div className="am-form-row">
            <label htmlFor="cl-desc">Job description</label>
            <textarea
              id="cl-desc"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              required
              rows={5}
            />
          </div>
          <div className="am-form-row">
            <label htmlFor="cl-mode">Profile context</label>
            <select id="cl-mode" value={profileMode} onChange={(e) => setProfileMode(e.target.value)}>
              <option value="manual">Paste resume or notes</option>
              <option value="saved_resume">Saved resume from Resume Builder</option>
              <option value="linkedin">Use LinkedIn (connect and sync on LinkedIn tab)</option>
            </select>
          </div>
          {profileMode === 'manual' && (
            <div className="am-form-row">
              <label htmlFor="cl-resume">Resume / notes</label>
              <textarea
                id="cl-resume"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={6}
                placeholder="Paste relevant experience or leave blank to use profile only"
              />
            </div>
          )}
          {profileMode === 'saved_resume' && (
            <div className="am-form-row">
              <label htmlFor="cl-sr">Saved resume</label>
              <select id="cl-sr" value={resumeId} onChange={(e) => setResumeId(e.target.value)} required>
                <option value="">Select…</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="am-btn am-btn--primary" disabled={generating}>
            <Sparkles size={18} />
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </form>

        <div className="am-card" style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>Output</h3>
          <div className="am-output">{output || (generating ? '…' : 'Generated text appears here.')}</div>
          {lastId && (
            <button
              type="button"
              className="am-btn am-btn--ghost"
              style={{ marginTop: 12 }}
              onClick={() => saveToDocuments(lastId)}
              disabled={savingId === lastId}
            >
              {savingId === lastId ? 'Saving…' : 'Save to My Documents'}
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="am-card">
          <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>History</h2>
          {loadingHistory ? (
            <p className="am-muted">Loading…</p>
          ) : history.length === 0 ? (
            <p className="am-muted">No cover letters yet.</p>
          ) : (
            history.map((h) => (
              <button key={h.id} type="button" className="am-history-item" onClick={() => openLetter(h.id)}>
                <strong>
                  {h.jobTitle} — {h.company}
                </strong>
                <span>{h.preview || ''}</span>
                <span>{h.createdAt && new Date(h.createdAt).toLocaleString()}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {modal && (
        <div
          className="am-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="am-cl-modal-title"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) setModal(null);
          }}
        >
          <div className="am-modal">
            <h2 id="am-cl-modal-title">
              {modal.jobTitle} — {modal.companyName}
            </h2>
            <p className="am-muted" style={{ marginTop: 0 }}>
              {modal.createdAt && new Date(modal.createdAt).toLocaleString()}
            </p>
            <div className="am-output" style={{ maxHeight: '50vh', overflow: 'auto' }}>
              {modal.content}
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="am-btn am-btn--primary"
                onClick={() => saveToDocuments(modal.id)}
                disabled={savingId === modal.id}
              >
                {savingId === modal.id ? 'Saving…' : 'Save to My Documents'}
              </button>
              <button type="button" className="am-btn am-btn--ghost" onClick={() => setModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
