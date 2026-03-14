import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, CheckCircle, Lock } from 'lucide-react'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

function CheckoutForm({ planId, price, user }) {
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState(user?.email || '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            localStorage.setItem('selectedPlanId', planId);
            const res = await api.post('/subscriptions/checkout-session', {
                plan_id: planId,
                email: email?.trim() || undefined,
            });
            window.location.href = res.data.url;
        } catch (err) {
            setMessage(err.response?.data?.message || 'Unable to start checkout right now.');
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.summaryCard}>
                <div style={styles.inputGroup}>
                    <label htmlFor="checkout-email" style={styles.label}>
                        Email for this purchase
                    </label>
                    <input
                        id="checkout-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        style={styles.input}
                        required
                    />
                    <div style={styles.helperText}>
                        Enter the email where you want to receive access. You can use a different email than your account.
                    </div>
                </div>
            </div>

            <div style={styles.summaryCard}>
                <div style={styles.label}>Payment method</div>
                <div style={styles.helperText}>
                    You will be redirected to Stripe&apos;s secure hosted checkout to finish payment and confirm your email.
                </div>
            </div>

            {message && <div style={{ color: '#DC2626', marginTop: '10px', fontSize: '14px' }}>{message}</div>}

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
                Secure payment powered by Stripe.
            </p>
        </form>
    )
}

export default function Checkout() {
    const location = useLocation()
    const queryParams = new URLSearchParams(location.search)
    const { user } = useAuth()
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
    )
    const planName = queryParams.get('plan') || localStorage.getItem('selectedPlanName') || 'Success Pack'
    const [planId] = useState(localStorage.getItem('selectedPlanId') || '')

    const planPrices = {
        'Professional Resume': '$15.00',
        'Starter Pack': '$30.00',
        'Success Pack': '$60.00',
        'Elite Pack': '$100.00',
    }
    const planIdMap = {
        'Professional Resume': 'professional_resume',
        'Starter Pack': 'starter_pack',
        'Success Pack': 'success_pack',
        'Elite Pack': 'elite_pack',
    }
    const price = planPrices[planName] || '$60.00'
    const resolvedPlanId = planId || planIdMap[planName] || 'success_pack'

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <div style={{ ...styles.container, ...(isMobile ? styles.containerMobile : {}) }}>
            <div style={{ ...styles.checkoutWrapper, ...(isMobile ? styles.checkoutWrapperMobile : {}) }}>
                <div style={{ ...styles.detailsSide, ...(isMobile ? styles.detailsSideMobile : {}) }}>
                    <Link to="/#pricing" style={{ ...styles.backLink, ...(isMobile ? styles.backLinkMobile : {}) }}>
                        <ArrowLeft size={16} />
                        Back
                    </Link>

                    <div style={{ ...styles.brand, ...(isMobile ? styles.brandMobile : {}) }}>
                        <div style={styles.logoIcon}></div>
                        HiredLogics
                    </div>

                    <div style={{ ...styles.summary, ...(isMobile ? styles.summaryMobile : {}) }}>
                        <h2 style={styles.planName}>Subscribe to {planName}</h2>
                        <div style={styles.priceContainer}>
                            <span style={{ ...styles.price, ...(isMobile ? styles.priceMobile : {}) }}>{price}</span>
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

                <div style={{ ...styles.paymentSide, ...(isMobile ? styles.paymentSideMobile : {}) }}>
                    <h3 style={{ ...styles.paymentTitle, ...(isMobile ? styles.paymentTitleMobile : {}) }}>Checkout</h3>
                    <CheckoutForm planId={resolvedPlanId} price={price} user={user} />
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
    containerMobile: {
        padding: '16px',
        alignItems: 'stretch',
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
    checkoutWrapperMobile: {
        flexDirection: 'column',
        maxWidth: '100%',
        minHeight: 'auto',
        borderRadius: '20px',
    },
    detailsSide: {
        width: '45%',
        background: '#F0F4FF',
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
    },
    detailsSideMobile: {
        width: '100%',
        padding: '24px',
    },
    paymentSide: {
        width: '55%',
        padding: '48px',
        display: 'flex',
        flexDirection: 'column',
    },
    paymentSideMobile: {
        width: '100%',
        padding: '24px',
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
    backLinkMobile: {
        marginBottom: '24px',
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
    brandMobile: {
        marginBottom: '24px',
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
    summaryMobile: {
        marginBottom: '24px',
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
    priceMobile: {
        fontSize: '40px',
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
    paymentTitleMobile: {
        marginBottom: '20px',
        fontSize: '22px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '420px',
        width: '100%',
    },
    summaryCard: {
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '16px',
        background: '#F9FAFB',
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
    readonlyValue: {
        fontSize: '15px',
        color: 'var(--dark)',
        fontWeight: '600',
        wordBreak: 'break-word',
    },
    helperText: {
        color: 'var(--gray)',
        fontSize: '14px',
        lineHeight: 1.5,
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
