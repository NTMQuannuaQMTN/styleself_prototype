/** Destinations for landing-page CTAs. */
export const ROUTES = {
  login: '/login',
  signup: '/create-account',
  merchantSignup: '/create-account?role=merchant',
  customerSignup: '/create-account?role=customer',
  app: '/app',
} as const

export const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Merchants', href: '#for-merchants' },
  { label: 'For Shoppers', href: '#for-shoppers' },
] as const
