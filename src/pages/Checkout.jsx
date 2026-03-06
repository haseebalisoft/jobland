import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, CheckCircle, Lock } from 'lucide-react'
import api from '../services/api.js'

function CheckoutForm({ planId, price, plan }) {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            localStorage.setItem('selectedPlanId', planId);
            const res = await api.post('/subscriptions/checkout-session', { planId });
            window.location.href = res.data.url;
        } catch (err) {
            setMessage('Unable to start checkout. Please ensure you are logged in and verified.');
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
                <label style={styles.label}>Email</label>
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={styles.input}
                />
            </div>

            {message && <div style={{ color: 'green', marginTop: '10px', fontSize: '14px' }}>{message}</div>}

            <button
                type="submit"
                disabled={isLoading}
                style={{
                    ...styles.payButton,
                    opacity: isLoading ? 0.7 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
            >
                {isLoading ? (
                    <span style={styles.loader}>Processing...</span>
                ) : (
                    <>
                        <Lock size={16} />
                        Pay {price}
                    </>
                )}
            </button>

            <p style={styles.secureNote}>
                <ShieldCheck size={14} />
                This is a mock checkout – no real payment will be charged.
            </p>
        </form>
    )
}

export default function Checkout() {
    const location = useLocation()
    const queryParams = new URLSearchParams(location.search)
    const planName = queryParams.get('plan') || localStorage.getItem('selectedPlanName') || 'Success Pack'
    const [planId] = useState(localStorage.getItem('selectedPlanId') || '')

    const planPrices = {
        'Professional Resume': '$15.00',
        'Starter Pack': '$30.00',
        'Success Pack': '$60.00',
        'Elite Pack': '$100.00',
    }
    const price = planPrices[planName] || '$60.00'
    return (
        <div style={styles.container}>
            <div style={styles.checkoutWrapper}>
                <div style={styles.detailsSide}>
                    <Link to="/#pricing" style={styles.backLink}>
                        <ArrowLeft size={16} />
                        Back
                    </Link>

                    <div style={styles.brand}>
                        <div style={styles.logoIcon}></div>
                        JobLand
                    </div>

                    <div style={styles.summary}>
                        <h2 style={styles.planName}>Subscribe to {planName}</h2>
                        <div style={styles.priceContainer}>
                            <span style={styles.price}>{price}</span>
                        </div>
                    </div>

                    <div style={styles.features}>
                        <div style={styles.featureItem}>
                            <CheckCircle size={16} color="var(--primary)" />
                            <span>Instant access to your new dashboard</span>
                        </div>
                        <div style={styles.featureItem}>
                            <CheckCircle size={16} color="var(--primary)" />
                            <span>Priority ATS-Optimized CV Generation</span>
                        </div>
                        <div style={styles.featureItem}>
                            <CheckCircle size={16} color="var(--primary)" />
                            <span>100% money-back guarantee within 14 days</span>
                        </div>
                    </div>
                </div>

                <div style={styles.paymentSide}>
                    <h3 style={styles.paymentTitle}>Checkout</h3>
                    <CheckoutForm planId={planId} price={price} plan={planName} />
                </div>
            </div>
        </div>
    )
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F7FAFC',
        padding: '24px',
        fontFamily: 'var(--font-primary)'
    },
    checkoutWrapper: {
        display: 'flex',
        width: '100%',
        maxWidth: '960px',
        background: 'white',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.05)',
        minHeight: '600px',
        border: '1px solid var(--gray-border)'
    },
    detailsSide: {
        width: '45%',
        background: '#F0F4FF',
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
    },
    paymentSide: {
        width: '55%',
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
    },
    backLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--gray)',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '48px',
        transition: 'color 0.2s',
    },
    brand: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '20px',
        fontWeight: '800',
        color: 'var(--dark)',
        marginBottom: '48px',
    },
    logoIcon: {
        width: '28px',
        height: '28px',
        background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
        borderRadius: '6px',
    },
    summary: {
        marginBottom: '40px',
    },
    planName: {
        fontSize: '16px',
        color: 'var(--gray)',
        fontWeight: '600',
        marginBottom: '12px',
    },
    priceContainer: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
    },
    price: {
        fontSize: '48px',
        fontWeight: '800',
        color: 'var(--dark)',
        lineHeight: 1,
        letterSpacing: '-1px',
    },
    features: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    featureItem: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        fontSize: '15px',
        color: 'var(--dark)',
        fontWeight: '500',
        lineHeight: 1.5,
    },
    paymentTitle: {
        fontSize: '24px',
        fontWeight: '700',
        color: 'var(--dark)',
        marginBottom: '32px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '420px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--dark)',
    },
    input: {
        width: '100%',
        padding: '12px 16px',
        border: '1px solid #e6e6e6',
        borderRadius: '8px',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.2s',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
    },
    payButton: {
        width: '100%',
        padding: '16px',
        background: 'var(--primary)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '8px',
        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
        transition: 'all 0.2s',
    },
    loader: {
        opacity: 0.9,
    },
    secureNote: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        color: 'var(--gray)',
        fontSize: '13px',
        marginTop: '8px',
    }
}
