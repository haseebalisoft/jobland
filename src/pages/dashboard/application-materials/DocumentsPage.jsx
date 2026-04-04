import { useCallback, useEffect, useState } from 'react';
import { Search, Upload } from 'lucide-react';
import api from '../../../services/api.js';

const CATEGORIES = ['Resume', 'Cover Letter', 'Certificate', 'Portfolio', 'Other'];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('Resume');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/documents', {
        params: {
          page,
          limit: 24,
          search: search.trim() || undefined,
          category: category === 'all' ? undefined : category,
          sort: 'created_desc',
        },
      });
      setDocuments(data.documents || []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    load();
  }, [load]);

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title.trim());
      fd.append('category', cat);
      if (description.trim()) fd.append('description', description.trim());
      await api.post('/documents', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadOpen(false);
      setTitle('');
      setDescription('');
      setFile(null);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      load();
    } catch (e) {
      window.alert(e?.response?.data?.message || e.message);
    }
  };

  const onDownload = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || 'document';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      window.alert(e?.response?.data?.message || e.message);
    }
  };

  return (
    <>
      <div className="am-toolbar">
        <label className="am-search">
          <Search size={18} color="#9ca3af" />
          <input
            type="search"
            placeholder="Search documents"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            autoComplete="off"
          />
        </label>
        <select className="am-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="button" className="am-btn am-btn--primary" onClick={() => setUploadOpen((v) => !v)}>
          <Upload size={18} />
          Upload
        </button>
      </div>

      {error && (
        <div className="am-banner am-banner--warn" role="alert">
          {error}
        </div>
      )}

      {uploadOpen && (
        <form className="am-card" onSubmit={onUpload}>
          <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>Upload document</h2>
          <div className="am-form-row">
            <label htmlFor="am-file">File (PDF, DOC, DOCX, PNG, JPG — max 25MB)</label>
            <input
              id="am-file"
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="am-form-row">
            <label htmlFor="am-title">Title</label>
            <input id="am-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="am-form-row">
            <label htmlFor="am-cat">Category</label>
            <select id="am-cat" value={cat} onChange={(e) => setCat(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="am-form-row">
            <label htmlFor="am-desc">Description (optional)</label>
            <textarea id="am-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="am-btn am-btn--primary" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Save'}
            </button>
            <button type="button" className="am-btn am-btn--ghost" onClick={() => setUploadOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="am-muted">Loading…</p>
      ) : documents.length === 0 ? (
        <div className="am-empty">No documents yet. Upload your first file.</div>
      ) : (
        <div className="am-grid">
          {documents.map((d) => (
            <div key={d.id} className="am-doc-card">
              <h3>{d.title}</h3>
              <div className="am-doc-card__meta">
                {d.category} · {d.kind || 'File'}
                {d.createdAt && ` · ${new Date(d.createdAt).toLocaleDateString()}`}
              </div>
              {d.description && <p className="am-muted" style={{ margin: 0, fontSize: '13px' }}>{d.description}</p>}
              <div className="am-doc-card__actions">
                <button type="button" onClick={() => onDownload(d)}>
                  Download
                </button>
                <button type="button" onClick={() => onDelete(d.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && total > 24 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="am-btn am-btn--ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="am-muted">Page {page}</span>
          <button
            type="button"
            className="am-btn am-btn--ghost"
            disabled={page * 24 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
