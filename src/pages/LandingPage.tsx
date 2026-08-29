import { Navbar } from '../components/landing/Navbar'
import { Hero } from '../components/landing/Hero'
import { ValueProposition } from '../components/landing/ValueProposition'
import { HowItWorks } from '../components/landing/HowItWorks'
import { MerchantSection } from '../components/landing/MerchantSection'
import { LocationInventory } from '../components/landing/LocationInventory'
import { Personalization } from '../components/landing/Personalization'
import { TrustSection } from '../components/landing/TrustSection'
import { FinalCTA } from '../components/landing/FinalCTA'
import { Footer } from '../components/landing/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main>
        <Hero />
        <ValueProposition />
        <HowItWorks />
        <MerchantSection />
        <LocationInventory />
        <Personalization />
        <TrustSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
