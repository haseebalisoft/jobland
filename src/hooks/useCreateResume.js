import { useCallback, useState } from 'react';
import api from '../services/api';

/**
 * API: POST /api/resumes/upload | /api/resumes | /api/resumes/from-linkedin | /api/resumes/from-ai
 */
export function useCreateResume() {
  const [loadingKey, setLoadingKey] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  const upload = useCallback(async (file, { onProgress } = {}) => {
    setLoadingKey('upload');
    setUploadProgress(0);
    try {
      const form = new FormData();
      form.append('file', file);
      const baseName = (file.name || 'resume').replace(/\.(pdf|docx|doc)$/i, '') || 'Resume';
      form.append('name', baseName);
      const res = await api.post('/resumes/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          if (ev.total) {
            const p = Math.round((ev.loaded / ev.total) * 100);
            setUploadProgress(p);
            onProgress?.(p);
          }
        },
      });
      setUploadProgress(100);
      return res.data;
    } finally {
      setLoadingKey(null);
      setUploadProgress(null);
    }
  }, []);

  const createBlank = useCallback(async () => {
    setLoadingKey('blank');
    try {
      const res = await api.post('/resumes', { type: 'base', source: 'blank' });
      return res.data;
    } finally {
      setLoadingKey(null);
    }
  }, []);

  const fromLinkedIn = useCallback(async () => {
    setLoadingKey('linkedin');
    try {
      const res = await api.post('/resumes/from-linkedin');
      return res.data;
    } finally {
      setLoadingKey(null);
    }
  }, []);

  const fromAi = useCallback(async (prompt) => {
    setLoadingKey('ai');
    try {
      const res = await api.post('/resumes/from-ai', { prompt });
      return res.data;
    } finally {
      setLoadingKey(null);
    }
  }, []);

  const clearError = useCallback(() => {}, []);

  return {
    loadingKey,
    uploadProgress,
    upload,
    createBlank,
    fromLinkedIn,
    fromAi,
    clearError,
  };
}
