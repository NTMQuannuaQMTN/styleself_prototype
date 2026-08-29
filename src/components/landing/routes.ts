/** Destinations for landing-page CTAs. */
export const ROUTES = {
  login: '/login',
  signup: '/signup',
  dashboard: '/merchant',
  demoAgent: '/agent/demo',
} as const

export const NAV_LINKS = [
  { label: 'Architecture', href: '#architecture' },
  { label: 'Trust & Security', href: '#security' },
  { label: 'For Merchants', href: '#for-merchants' },
] as const
