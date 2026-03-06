import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api.js';

export default function VerifyEmail() {
  const [message, setMessage] = useState('Verifying your email...');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) {
      setMessage('Invalid verification link.');
      return;
    }

    (async () => {
      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setMessage('Email verified! Redirecting to checkout...');
        const planId = localStorage.getItem('selectedPlanId');
        if (planId) {
          const res = await api.post('/subscriptions/checkout-session', { planId });
          window.location.href = res.data.url;
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        setMessage('Verification failed or token expired.');
      }
    })();
  }, [location.search, navigate]);

  return <div style={{ padding: 40 }}>{message}</div>;
}

