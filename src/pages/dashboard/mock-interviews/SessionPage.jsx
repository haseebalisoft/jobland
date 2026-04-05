import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import InterviewChat from '../../../components/mock-interview/InterviewChat.jsx';

export default function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialScenario = location.state?.scenario || null;
  const firstMessage = location.state?.firstMessage;

  const initialMessages = useMemo(() => {
    if (!firstMessage) return [];
    return [{ role: 'assistant', content: firstMessage, id: 'opening', createdAt: Date.now() }];
  }, [firstMessage]);

  return (
    <InterviewChat
      sessionId={sessionId}
      initialScenario={initialScenario}
      initialMessages={initialMessages}
      navigate={navigate}
    />
  );
}
