import { Navbar } from '../components/landing/Navbar'
import { Hero } from '../components/landing/Hero'
import { ValueProposition } from '../components/landing/ValueProposition'
import { NoAITeam } from '../components/landing/NoAITeam'
import { CategoryAgent } from '../components/landing/CategoryAgent'
import { LocationInventory } from '../components/landing/LocationInventory'
import { CustomerExperience } from '../components/landing/CustomerExperience'
import { MerchantDeployment } from '../components/landing/MerchantDeployment'
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
        <NoAITeam />
        <CategoryAgent />
        <LocationInventory />
        <CustomerExperience />
        <MerchantDeployment />
        <TrustSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
