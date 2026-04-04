import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

const MAX = 1000;

export default function AIPromptModal({ isOpen, onClose, onSubmit, loading = false, aiError = '' }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!isOpen) setText('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const remaining = MAX - text.length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    onSubmit(text.trim());
  };

  return (
    <div className="cr-modal-root cr-modal-root--stack" role="dialog" aria-modal="true" aria-labelledby="ai-prompt-title">
      <div
        className="cr-modal-backdrop"
        style={{ background: 'rgba(30, 58, 95, 0.6)' }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />
      <div className="cr-modal cr-modal--ai cr-modal-enter">
        <div className="cr-modal__header cr-modal__header--row">
          <div>
            <h2 id="ai-prompt-title" className="cr-modal__title">
              Describe Your Resume
            </h2>
            <p className="cr-modal__subtitle">Tell the AI about your experience, skills, target role…</p>
          </div>
          <button type="button" className="cr-modal__close" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <div className="cr-modal__divider" />
        <form onSubmit={handleSubmit} className="cr-ai-form">
          <textarea
            className="cr-ai-textarea"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            placeholder="Tell the AI about your experience, skills, target role..."
            rows={8}
            disabled={loading}
          />
          <div className="cr-ai-meta">
            <span className={remaining < 0 ? 'cr-ai-counter cr-ai-counter--warn' : 'cr-ai-counter'}>
              {remaining} characters left
            </span>
          </div>
          {aiError ? (
            <p className="cr-option-card__error" role="alert">
              {aiError}
            </p>
          ) : null}
          <button type="submit" className="cr-btn-primary" disabled={loading || !text.trim()}>
            {loading ? (
              <>
                <Loader2 className="cr-spinner-inline" size={18} />
                AI is building your resume…
              </>
            ) : (
              'Generate Resume'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
