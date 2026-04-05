import { useCallback, useState } from 'react';
import { streamInterviewMessage } from './useAIChat.js';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Streaming mock-interview chat against existing POST /mock-interviews/sessions/:id/message SSE.
 */
export function useInterviewChat({ sessionId, initialMessages = [] }) {
  const [messages, setMessages] = useState(() =>
    initialMessages.map((m) => ({
      ...m,
      id: m.id || makeId(),
      createdAt: m.createdAt || Date.now(),
    })),
  );
  const [streamingText, setStreamingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = String(text || '').trim();
      if (!trimmed || isTyping) return;

      setError(null);
      const userMsg = { role: 'user', content: trimmed, id: makeId(), createdAt: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      setStreamingText('');

      try {
        await streamInterviewMessage(sessionId, trimmed, {
          onChunk: (c) => setStreamingText((prev) => prev + c),
          onDone: (meta) => {
            setIsTyping(false);
            setStreamingText('');
            if (meta?.reply) {
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: meta.reply,
                  id: makeId(),
                  createdAt: Date.now(),
                },
              ]);
            }
          },
          onError: (err) => {
            setIsTyping(false);
            setStreamingText('');
            setError(typeof err === 'string' ? err : 'Something went wrong');
          },
        });
      } catch (e) {
        setIsTyping(false);
        setStreamingText('');
        setError(e.message || 'Send failed');
      }
    },
    [sessionId, isTyping],
  );

  const appendAssistantPlaceholder = useCallback((content) => {
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content, id: makeId(), createdAt: Date.now() },
    ]);
  }, []);

  return {
    messages,
    setMessages,
    streamingText,
    isTyping,
    error,
    setError,
    sendMessage,
    appendAssistantPlaceholder,
  };
}
