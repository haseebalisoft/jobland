import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, Mail, KeyRound } from 'lucide-react';
import api from '../services/api.js';

const PLAN_COPY = {
  'Professional Resume': {
    name: 'Professional Resume',
    headline: 'Pro ATS‑optimised CV that gets interviews.',
    price: '$15',
  },
  'Starter Pack': {
    name: 'Starter Pack',
    headline: 'One guaranteed interview to start momentum.',
    price: '$30',
  },
  'Success Pack': {
    name: 'Success Pack',
    headline: 'Our most popular interview‑winning bundle.',
    price: '$60',
  },
  'Elite Pack': {
    name: 'Elite Pack',
    headline: 'Maximum exposure for serious career moves.',
    price: '$100',
  },
};

export default function Start() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const planName =
    searchParams.get('plan') || localStorage.getItem('selectedPlanName') || 'Success Pack';

  const copy = PLAN_COPY[planName] || PLAN_COPY['Success Pack'];

  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/start-email-verification', { email });
      setStep('otp');
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.errors) && err.response.data.errors[0]?.msg) ||
        'Unable to send verification code';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const verifyRes = await api.post('/auth/verify-otp', { email, otp });
      const verificationToken = verifyRes.data.verificationToken;

      const normalizedPlanId =
        planName === 'Professional Resume'
          ? 'professional_resume'
          : planName === 'Starter Pack'
          ? 'starter_pack'
          : planName === 'Elite Pack'
          ? 'elite_pack'
          : 'success_pack';

      const checkoutRes = await api.post('/payments/create-checkout-session', {
        verificationToken,
        planId: normalizedPlanId,
      });
      window.location.href = checkoutRes.data.checkoutUrl;
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.errors) && err.response.data.errors[0]?.msg) ||
        'Unable to verify code or start checkout';
      setError(message);
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) return;
    setError('');
    setResending(true);
    try {
      await api.post('/auth/start-email-verification', { email });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.errors) && err.response.data.errors[0]?.msg) ||
        'Unable to resend verification code';
      setError(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.leftPane}>
          <Link to="/" style={styles.logo}>
            <div style={styles.logoIcon}></div>
            Hiredlogic
          </Link>
          <h1 style={styles.heading}>Secure your plan in two steps</h1>
          <p style={styles.subheading}>
            We verify your email with a one‑time code, then redirect you to secure Stripe checkout
            for payment.
          </p>

          <div style={styles.planCard}>
            <div style={styles.planLabel}>You selected</div>
            <div style={styles.planName}>{copy.name}</div>
            <div style={styles.planPrice}>{copy.price}</div>
            <p style={styles.planHeadline}>{copy.headline}</p>
          </div>
        </div>

        <div style={styles.rightPane}>
          <div style={styles.stepHeader}>
            <div style={{ ...styles.stepPill, ...(step === 'email' ? styles.stepPillActive : {}) }}>
              <span style={styles.stepNumber}>1</span>Email
            </div>
            <div style={styles.stepDivider} />
            <div style={{ ...styles.stepPill, ...(step === 'otp' ? styles.stepPillActive : {}) }}>
              <span style={styles.stepNumber}>2</span>Verification code
            </div>
          </div>

          {step === 'email' && (
            <form style={styles.form} onSubmit={handleSendEmail}>
              <label style={styles.label}>Email address</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                />
              </div>
              <p style={styles.helper}>
                We’ll send a 6‑digit code to this email. Use the same address for Stripe so we can
                activate your account automatically.
              </p>
              {error && <p style={styles.error}>{error}</p>}
              <button type="submit" style={styles.primaryButton} disabled={loading}>
                {loading ? 'Sending...' : 'Send verification code'}
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form style={styles.form} onSubmit={handleVerifyOtp}>
              <label style={styles.label}>Verification code</label>
              <div style={styles.inputWrapper}>
                <KeyRound size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  required
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={styles.input}
                />
              </div>
              <p style={styles.helper}>
                Enter the 6‑digit code we sent to <strong>{email}</strong>. After verification you’ll
                be redirected to Stripe to complete payment.
              </p>
              {error && <p style={styles.error}>{error}</p>}
              <button type="submit" style={styles.primaryButton} disabled={loading}>
                {loading ? 'Redirecting…' : 'Verify & continue to payment'}
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={handleResendOtp}
                disabled={resending}
              >
                {resending ? 'Sending new code…' : 'Resend code'}
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setStep('email')}
              >
                Use a different email
              </button>
            </form>
          )}
        </div>
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
    background: 'linear-gradient(135deg, #EEF2FF 0%, #E0F2FE 40%, #FDF2FF 100%)',
    padding: '24px',
    fontFamily: 'var(--font-primary)',
  },
  card: {
    width: '100%',
    maxWidth: '1000px',
    display: 'flex',
    borderRadius: '28px',
    overflow: 'hidden',
    background: 'white',
    boxShadow: '0 30px 80px rgba(15, 23, 42, 0.18)',
    border: '1px solid rgba(148, 163, 184, 0.35)',
  },
  leftPane: {
    flex: 1.1,
    padding: '40px 40px 40px 40px',
    background: 'radial-gradient(circle at top left, #4F46E5 0%, #312E81 45%, #0F172A 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  rightPane: {
    flex: 1,
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: 800,
    fontSize: '22px',
    color: 'white',
    textDecoration: 'none',
    marginBottom: '32px',
  },
  logoIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, #22C55E 0%, #A855F7 100%)',
  },
  heading: {
    fontSize: '30px',
    fontWeight: 800,
    lineHeight: 1.2,
    marginBottom: '12px',
  },
  subheading: {
    fontSize: '15px',
    opacity: 0.8,
    maxWidth: '360px',
  },
  planCard: {
    marginTop: '32px',
    padding: '18px 20px',
    borderRadius: '18px',
    background: 'rgba(15, 23, 42, 0.55)',
    border: '1px solid rgba(191, 219, 254, 0.3)',
  },
  planLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    opacity: 0.7,
    marginBottom: '4px',
  },
  planName: {
    fontSize: '18px',
    fontWeight: 700,
  },
  planPrice: {
    fontSize: '26px',
    fontWeight: 800,
    marginTop: '4px',
  },
  planHeadline: {
    fontSize: '13px',
    opacity: 0.85,
    marginTop: '6px',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
  },
  stepPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#6B7280',
    background: '#F3F4F6',
  },
  stepPillActive: {
    background: '#EEF2FF',
    color: '#4F46E5',
  },
  stepNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '18px',
    height: '18px',
    borderRadius: '999px',
    background: 'white',
    fontSize: '11px',
  },
  stepDivider: {
    flex: 1,
    height: '1px',
    background: '#E5E7EB',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    maxWidth: '360px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9CA3AF',
  },
  input: {
    width: '100%',
    padding: '11px 14px 11px 40px',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    fontSize: '15px',
    outline: 'none',
    transition: 'box-shadow 0.15s, border-color 0.15s',
  },
  helper: {
    fontSize: '13px',
    color: '#6B7280',
    lineHeight: 1.5,
  },
  error: {
    fontSize: '13px',
    color: '#DC2626',
  },
  primaryButton: {
    marginTop: '4px',
    padding: '12px 16px',
    borderRadius: '999px',
    border: 'none',
    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #22C55E 100%)',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '15px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  secondaryButton: {
    marginTop: '6px',
    padding: '10px 14px',
    borderRadius: '999px',
    border: '1px solid #E5E7EB',
    background: '#FFFFFF',
    color: '#374151',
    fontWeight: 500,
    fontSize: '13px',
    cursor: 'pointer',
  },
};

