import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import IntakeForm from '../components/IntakeForm'
import HowItWorks from '../components/HowItWorks'
import Services from '../components/Services'
import Pricing from '../components/Pricing'
import WhyHiredLogics from '../components/WhyHiredLogics'
import Testimonials from '../components/Testimonials'
import FAQ from '../components/FAQ'
import CTA from '../components/CTA'
import Footer from '../components/Footer'

export default function Home() {
    const [searchParams, setSearchParams] = useSearchParams()
    const showResumePaidBanner = searchParams.get('resumePaidRequired') === '1'

    useEffect(() => {
        if (!showResumePaidBanner) return
        const t = window.setTimeout(() => {
            document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
        return () => window.clearTimeout(t)
    }, [showResumePaidBanner])

    const dismissResumeBanner = () => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                next.delete('resumePaidRequired')
                return next
            },
            { replace: true }
        )
    }

    return (
        <>
            {showResumePaidBanner && (
                <div
                    role="status"
                    style={{
                        position: 'fixed',
                        top: 92,
                        right: 20,
                        zIndex: 1100,
                        maxWidth: 420,
                        width: 'calc(100% - 40px)',
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: 'linear-gradient(90deg, rgba(245,158,11,0.96) 0%, rgba(249,115,22,0.95) 100%)',
                        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#fff',
                    }}
                >
                    <span>Paid plan required for resume generation.</span>
                    <button
                        type="button"
                        onClick={dismissResumeBanner}
                        style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.45)',
                            background: 'rgba(255,255,255,0.15)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                        }}
                    >
                        Dismiss
                    </button>
                </div>
            )}
            <Navbar />
            <main>
                <Hero />
                <IntakeForm />
                <HowItWorks />
                <Services />
                <Pricing />
                <WhyHiredLogics />
                <Testimonials />
                <FAQ />
                <CTA />
            </main>
            <Footer />
        </>
    )
}
