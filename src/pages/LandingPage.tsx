import { Navbar } from '../components/landing/Navbar'
import { Footer } from '../components/landing/Footer'
import {
  StoryHero,
  SplitArchitecture,
  VisaStack,
  TrustSecurity,
  Onboarding,
  StoryCTA,
} from '../components/landing/story'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main>
        <StoryHero />
        <SplitArchitecture />
        <VisaStack />
        <TrustSecurity />
        <Onboarding />
        <StoryCTA />
      </main>
      <Footer />
    </div>
  )
}
