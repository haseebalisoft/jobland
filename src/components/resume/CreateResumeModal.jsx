import { useEffect, useRef, useState } from 'react';
import { X, FileText, Linkedin, Wand2, LayoutTemplate } from 'lucide-react';
import ResumeOptionCard from './ResumeOptionCard.jsx';
import AIPromptModal from './AIPromptModal.jsx';
import { useCreateResume } from '../../hooks/useCreateResume.js';
import './CreateResumeModal.css';

const CARDS = {
  upload: 'upload',
  linkedin: 'linkedin',
  ai: 'ai',
  blank: 'blank',
};

export default function CreateResumeModal({ isOpen, onClose, onSuccess, onToast }) {
  const fileRef = useRef(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const { loadingKey, uploadProgress, upload, createBlank, fromLinkedIn, fromAi, clearError } = useCreateResume();

  useEffect(() => {
    if (!isOpen) {
      setAiOpen(false);
      setErrors({});
      clearError();
    }
  }, [isOpen, clearError]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (aiOpen) setAiOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, aiOpen]);

  if (!isOpen) return null;

  const busy = !!loadingKey;
  const setCardError = (key, msg) => {
    setErrors((prev) => ({ ...prev, [key]: msg || '' }));
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const run = async (key, fn) => {
    setErrors({});
    try {
      const data = await fn();
      onToast?.('Resume created! Opening editor…', 'success');
      onSuccess?.(data);
      onClose();
    } catch (err) {
      const authUrl = err.response?.data?.authorizationUrl;
      if (authUrl) {
        window.location.href = authUrl;
        return;
      }
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Something went wrong';
      setCardError(key, msg);
      onToast?.(msg, 'error');
    }
  };

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await run(CARDS.upload, () => upload(file, { onProgress: () => {} }));
  };

  return (
    <>
      <div className="cr-modal-root" role="dialog" aria-modal="true" aria-labelledby="create-resume-title">
        <div
          className="cr-modal-backdrop"
          style={{ background: 'rgba(30, 58, 95, 0.6)' }}
          onMouseDown={handleBackdrop}
        />
        <div className="cr-modal cr-modal-enter">
          <div className="cr-modal__header cr-modal__header--row">
            <div>
              <h2 id="create-resume-title" className="cr-modal__title">
                Options To Create New Base Resume
              </h2>
              <p className="cr-modal__subtitle">Go with the option that fits best for you</p>
            </div>
            <button type="button" className="cr-modal__close" onClick={onClose} aria-label="Close">
              <X size={22} />
            </button>
          </div>
          <div className="cr-modal__divider" />
          <div className="cr-modal__body">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={onFileChange}
            />
            <ResumeOptionCard
              icon={FileText}
              title="Select An Existing Resume"
              subtitle="Pick a resume from your Hirdlogic or device."
              onClick={onPickFile}
              loading={loadingKey === CARDS.upload}
              disabled={busy && loadingKey !== CARDS.upload}
              error={errors[CARDS.upload]}
            />
            {loadingKey === CARDS.upload && uploadProgress != null && uploadProgress < 100 ? (
              <p className="cr-ai-counter" style={{ marginTop: -4 }}>
                Uploading… {uploadProgress}%
              </p>
            ) : null}

            <ResumeOptionCard
              icon={Linkedin}
              title="Build Using LinkedIn"
              subtitle="We'll fetch the details from your LinkedIn profile"
              onClick={() =>
                run(CARDS.linkedin, () => fromLinkedIn())
              }
              loading={loadingKey === CARDS.linkedin}
              disabled={busy && loadingKey !== CARDS.linkedin}
              error={errors[CARDS.linkedin]}
            />

            <ResumeOptionCard
              icon={Wand2}
              title="Start With AI Prompt"
              subtitle="Provide the instructions to the AI for your resume"
              onClick={() => {
                setErrors({});
                setAiOpen(true);
              }}
              loading={false}
              disabled={busy}
              error={errors[CARDS.ai]}
            />

            <ResumeOptionCard
              icon={LayoutTemplate}
              title="Choose A Blank Template"
              subtitle="You'll get a blank template to fill the details yourself"
              onClick={() => run(CARDS.blank, () => createBlank())}
              loading={loadingKey === CARDS.blank}
              disabled={busy && loadingKey !== CARDS.blank}
              error={errors[CARDS.blank]}
            />
          </div>
        </div>
      </div>

      <AIPromptModal
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
        loading={loadingKey === CARDS.ai}
        aiError={errors[CARDS.ai]}
        onSubmit={async (prompt) => {
          setErrors({});
          try {
            const data = await fromAi(prompt);
            setAiOpen(false);
            onToast?.('Resume created! Opening editor…', 'success');
            onSuccess?.(data);
            onClose();
          } catch (err) {
            const msg =
              err.response?.data?.message ||
              err.response?.data?.error ||
              err.message ||
              'AI generation failed';
            setCardError(CARDS.ai, msg);
            onToast?.(msg, 'error');
          }
        }}
      />
    </>
  );
}
