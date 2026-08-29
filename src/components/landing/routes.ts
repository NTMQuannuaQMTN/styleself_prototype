/** Destinations for landing-page CTAs. */
export const ROUTES = {
  login: '/login',
  signup: '/signup',
  dashboard: '/merchant',
  demoAgent: '/agent/demo',
} as const

export const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Merchants', href: '#for-merchants' },
  { label: 'The Experience', href: '#experience' },
] as const
