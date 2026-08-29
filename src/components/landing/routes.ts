/** Destinations for landing-page CTAs. Auth screens arrive in a later phase. */
export const ROUTES = {
  login: '/login',
  merchantSignup: '/create-account?role=merchant',
  customerSignup: '/create-account?role=customer',
} as const

export const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Merchants', href: '#for-merchants' },
  { label: 'For Shoppers', href: '#for-shoppers' },
] as const
