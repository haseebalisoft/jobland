import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';

export default function CheckoutSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem('selectedPlanId');

    let isMounted = true;

    const poll = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data?.isActive) {
          if (isMounted) navigate('/dashboard');
          return;
        }
      } catch (e) {
        // If not logged in anymore, stop polling and send to login
        if (e.response?.status === 401) {
          if (isMounted) navigate('/login');
          return;
        }
      }
      if (isMounted) {
        setTimeout(poll, 2000);
      }
    };

    poll();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return <div style={{ padding: 40 }}>Payment successful! Waiting for subscription activation...</div>;
}

