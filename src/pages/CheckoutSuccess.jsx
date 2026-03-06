import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, LoaderCircle, XCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setUser } = useAuth();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Finalizing your Stripe payment...');
  const sessionId = useMemo(() => searchParams.get('session_id') || '', [searchParams]);

  useEffect(() => {
    localStorage.removeItem('selectedPlanId');

    let cancelled = false;

    const sleep = (ms) =>
      new Promise((resolve) => {
        window.setTimeout(resolve, ms);
      });

    const finalizePayment = async () => {
      if (!sessionId) {
        setStatus('error');
        setMessage('Missing Stripe session id. Please contact support if you were charged.');
        return;
      }

      if (!user) {
        setStatus('success');
        setMessage(
          'Payment received. If you already have an account, sign in normally. If we created one for you after payment, check your email for the password setup link.',
        );
        return;
      }

      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const res = await api.get('/auth/me');
          if (cancelled) {
            return;
          }

          if (res.data) {
            setUser(res.data);
          }

          if (res.data?.isActive) {
            setStatus('success');
            setMessage('Payment confirmed. Redirecting you to your dashboard...');
            window.setTimeout(() => navigate('/dashboard'), 1200);
            return;
          }
        } catch (err) {
          if (cancelled) {
            return;
          }
        }

        await sleep(1500);
      }

      if (cancelled) {
        return;
      }

      setStatus('success');
      setMessage(
        'Payment received. Your subscription is being activated in the background. You can open your dashboard in a moment.',
      );
    };

    finalizePayment();

    return () => {
      cancelled = true;
    };
  }, [navigate, sessionId, setUser, user]);

  const icon =
    status === 'loading' ? (
      <LoaderCircle size={48} color="#4F46E5" />
    ) : status === 'success' ? (
      <CheckCircle size={48} color="#16A34A" />
    ) : (
      <XCircle size={48} color="#DC2626" />
    );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>{icon}</div>
        <h1 style={styles.title}>
          {status === 'success'
            ? 'Payment confirmed'
            : status === 'error'
              ? 'Payment confirmation needed'
              : 'Finishing checkout'}
        </h1>
        <p style={styles.message}>{message}</p>
        {status === 'error' && (
          <button type="button" onClick={() => navigate('/checkout')} style={styles.button}>
            Back to checkout
          </button>
        )}
        {status === 'success' && !user && (
          <div style={styles.actions}>
            <Link to="/login" style={styles.linkButton}>
              Sign in
            </Link>
            <Link to="/" style={styles.secondaryLink}>
              Back to home
            </Link>
          </div>
        )}
        {status === 'success' && user && (
          <div style={styles.actions}>
            <button type="button" onClick={() => navigate('/dashboard')} style={styles.button}>
              Open dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F8FAFC',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
    border: '1px solid #E5E7EB',
  },
  iconWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#111827',
    marginBottom: '12px',
  },
  message: {
    fontSize: '15px',
    color: '#6B7280',
    lineHeight: 1.6,
    marginBottom: 0,
  },
  button: {
    marginTop: '24px',
    border: 'none',
    borderRadius: '999px',
    padding: '12px 20px',
    background: '#4F46E5',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
  },
  actions: {
    marginTop: '24px',
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  linkButton: {
    borderRadius: '999px',
    padding: '12px 20px',
    background: '#4F46E5',
    color: 'white',
    fontWeight: '600',
    textDecoration: 'none',
  },
  secondaryLink: {
    borderRadius: '999px',
    padding: '12px 20px',
    background: '#EEF2FF',
    color: '#3730A3',
    fontWeight: '600',
    textDecoration: 'none',
  },
};

