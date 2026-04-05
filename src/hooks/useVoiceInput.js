import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Web Speech API dictation. Toggle to start/stop; each final phrase is appended via onAppend(text).
 */
export function useVoiceInput({ onAppend, lang = 'en-US' } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);
  const onAppendRef = useRef(onAppend);
  onAppendRef.current = onAppend;

  useEffect(() => {
    const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
    if (!SR) {
      setSupported(false);
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = false;
    r.lang = lang;
    r.onresult = (ev) => {
      const last = ev.results[ev.results.length - 1];
      const t = last[0]?.transcript?.trim();
      if (t && onAppendRef.current) onAppendRef.current(t);
    };
    r.onerror = () => setIsRecording(false);
    r.onend = () => setIsRecording(false);
    recognitionRef.current = r;
    return () => {
      try {
        r.abort();
      } catch {
        /* ignore */
      }
    };
  }, [lang]);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    try {
      r.stop();
    } catch {
      /* ignore */
    }
    setIsRecording(false);
  }, []);

  const start = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    try {
      r.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (isRecording) stop();
    else start();
  }, [isRecording, start, stop]);

  return { isRecording, supported, start, stop, toggle };
}
