import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Filter, Sparkles, Loader2, Trash2, Upload, Pencil } from 'lucide-react';

const pageBg = '#f8fafc';
const cardBg = '#ffffff';
const border = '#e2e8f0';
const blue = '#2563eb';
const text = '#0f172a';
const muted = '#64748b';

export default function ResumeAllResumesHub({
  savedResumes = [],
  loading = false,
  uploading = false,
  deletingId = null,
  onCreateNew,
  onUpload,
  onOpenPdf,
  onDelete,
  editHref,
}) {
  const [q, setQ] = useState('');
  const [mainTab, setMainTab] = useState('base');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let rows = Array.isArray(savedResumes) ? [...savedResumes] : [];
    if (mainTab === 'tailored') {
      rows = rows.filter((r) => {
        const t = (r.title || '').toLowerCase();
        const snap = r.profile_snapshot_json;
        const kind = snap && typeof snap === 'object' ? snap.kind : null;
        return kind === 'jd_tailored' || t.includes('tailor') || t.includes('job');
      });
    }
    if (!term) return rows;
    return rows.filter((r) => (r.title || '').toLowerCase().includes(term));
  }, [savedResumes, q, mainTab]);

  const empty = !loading && filtered.length === 0;

  return (
    <div style={{ background: pageBg, minHeight: '100%', padding: '24px 20px 48px' }}>
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          background: cardBg,
          borderRadius: 16,
          border: `1px solid ${border}`,
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${border}` }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: text, flex: '1 1 auto' }}>All Resumes</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', flex: '2 1 280px', justifyContent: 'flex-end' }}>
              <div
                style={{
                  flex: '1 1 200px',
                  maxWidth: 360,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: '#fff',
                }}
              >
                <Search size={18} color={muted} />
                <input
                  type="search"
                  placeholder="Search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14, color: text }}
                />
              </div>
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${border}`,
                  background: '#fff',
                  color: text,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <Filter size={18} />
                Filter
              </button>
              <button
                type="button"
                onClick={onCreateNew}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: blue,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                + Create New Resume
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${border}`, margin: '0 -22px -16px', padding: '0 22px' }}>
            {[
              { id: 'base', label: 'Base Resumes' },
              { id: 'tailored', label: 'Job Tailored Resumes' },
            ].map((tab) => {
              const active = mainTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMainTab(tab.id)}
                  style={{
                    padding: '12px 4px',
                    marginRight: 20,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? blue : muted,
                    borderBottom: active ? `2px solid ${blue}` : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '32px 24px 40px', minHeight: 360 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: muted, padding: 40 }}>
              <Loader2 className="animate-spin" style={{ display: 'inline-block', marginBottom: 12 }} size={32} />
              <div>Loading resumes…</div>
            </div>
          ) : empty ? (
            <div style={{ textAlign: 'center', maxWidth: 420, margin: '0 auto', padding: '24px 16px' }}>
              <div style={{ display: 'inline-flex', marginBottom: 16, color: blue }}>
                <FileText size={56} strokeWidth={1.25} />
                <Sparkles size={22} style={{ marginLeft: -12, marginTop: -4 }} />
              </div>
              <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: text }}>No Resumes Yet</h2>
              <p style={{ margin: '0 0 24px', fontSize: 15, color: muted, lineHeight: 1.55 }}>
                Get started on crafting your first resume to kickstart your career journey.
              </p>
              <button
                type="button"
                onClick={onCreateNew}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 22px',
                  borderRadius: 10,
                  border: 'none',
                  background: blue,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                + Create New Resume
              </button>
              <div style={{ marginTop: 20 }}>
                <button
                  type="button"
                  onClick={onUpload}
                  disabled={uploading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: `1px solid ${border}`,
                    background: '#fff',
                    color: text,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: uploading ? 'wait' : 'pointer',
                  }}
                >
                  {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                  Upload PDF
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {filtered.map((row) => (
                <div
                  key={row.id}
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: 14,
                    padding: 16,
                    background: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ fontWeight: 800, color: text, fontSize: 15 }}>{row.title || 'Untitled resume'}</div>
                  <div style={{ fontSize: 12, color: muted }}>
                    {row.created_at ? new Date(row.created_at).toLocaleString() : ''}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {editHref ? (
                      <Link
                        to={editHref(row.id)}
                        style={{
                          flex: '1 1 100px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: `1px solid ${border}`,
                          background: '#fff',
                          color: text,
                          fontWeight: 600,
                          fontSize: 13,
                          textDecoration: 'none',
                        }}
                      >
                        <Pencil size={16} />
                        Edit
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onOpenPdf(row.id)}
                      style={{
                        flex: '1 1 100px',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: blue,
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      Open PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      disabled={deletingId === row.id}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #fecaca',
                        background: '#fff1f2',
                        color: '#be123c',
                        cursor: deletingId === row.id ? 'wait' : 'pointer',
                      }}
                    >
                      {deletingId === row.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
