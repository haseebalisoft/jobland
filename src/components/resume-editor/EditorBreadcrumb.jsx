import { Link } from 'react-router-dom';
import { Home, Pencil, Link2, Rocket, Download, MoreVertical, Square } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function EditorBreadcrumb({
  resumeTitle,
  onRename,
  onTailor,
  onDownload,
  downloading,
  downloadDisabled,
  menuOpen,
  setMenuOpen,
  onDuplicate,
  onDelete,
  onShare,
  onExport,
  onCopyLink,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(resumeTitle);
  const inputRef = useRef(null);

  useEffect(() => {
    setDraft(resumeTitle);
  }, [resumeTitle]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = () => {
    setEditing(false);
    const t = draft.trim();
    if (t && t !== resumeTitle) onRename?.(t);
    else setDraft(resumeTitle);
  };

  return (
    <header className="re-breadcrumb">
      <div className="re-breadcrumb__left">
        <Link to="/dashboard" className="re-breadcrumb__link" aria-label="Home">
          <Home size={16} />
        </Link>
        <span className="re-breadcrumb__sep">›</span>
        <Link to="/resumes" className="re-breadcrumb__link">
          Base Resumes
        </Link>
        <span className="re-breadcrumb__sep">›</span>
        <span className="re-breadcrumb__tag">
          <Square size={10} fill="currentColor" />
          Default
        </span>
        {editing ? (
          <input
            ref={inputRef}
            className="re-input"
            style={{ maxWidth: 360, marginLeft: 8 }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraft(resumeTitle);
                setEditing(false);
              }
            }}
          />
        ) : (
          <span className="re-breadcrumb__title" style={{ marginLeft: 8 }}>
            {resumeTitle}
          </span>
        )}
        <button
          type="button"
          className="re-breadcrumb__link re-breadcrumb__edit"
          style={{ marginLeft: 4 }}
          aria-label="Rename"
          onClick={() => (editing ? commitRename() : setEditing(true))}
        >
          <Pencil size={14} />
        </button>
      </div>
      <div className="re-breadcrumb__right">
        <button type="button" className="re-icon-btn" title="Copy link" onClick={onCopyLink}>
          <Link2 size={18} />
        </button>
        <button type="button" className="re-btn-primary" onClick={onTailor}>
          <Rocket size={18} />
          Tailor for Job
        </button>
        <button type="button" className="re-btn-outline" onClick={onDownload} disabled={downloading || downloadDisabled}>
          <Download size={18} />
          {downloading ? 'Downloading…' : 'Download Resume'}
        </button>
        <div className="re-menu-wrap">
          <button
            type="button"
            className="re-icon-btn"
            aria-label="More"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="re-dropdown" role="menu">
              <button type="button" onClick={() => { onDuplicate?.(); setMenuOpen(false); }}>
                Duplicate
              </button>
              <button type="button" onClick={() => { onDelete?.(); setMenuOpen(false); }}>
                Delete
              </button>
              <button type="button" onClick={() => { onShare?.(); setMenuOpen(false); }}>
                Share
              </button>
              <button type="button" onClick={() => { onExport?.(); setMenuOpen(false); }}>
                Export
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
