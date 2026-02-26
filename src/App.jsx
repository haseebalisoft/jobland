import Navbar from './components/Navbar'
import Hero from './components/Hero'
import IntakeForm from './components/IntakeForm'
import HowItWorks from './components/HowItWorks'
import Services from './components/Services'
import Pricing from './components/Pricing'
import WhyHiredLogics from './components/WhyHiredLogics'
import Testimonials from './components/Testimonials'
import FAQ from './components/FAQ'
import CTA from './components/CTA'
import Footer from './components/Footer'

function App() {
  return (
    <>
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

export default App
