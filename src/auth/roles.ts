import type { UserRole } from '../lib/database.types'

export const ROLES: UserRole[] = ['merchant', 'customer']

export function isRole(value: unknown): value is UserRole {
  return value === 'merchant' || value === 'customer'
}

/** Where a user lands after signing in, based on their role. */
export function roleHome(role: UserRole): string {
  return role === 'merchant' ? '/merchant' : '/shop'
}

export const ROLE_COPY: Record<
  UserRole,
  { label: string; chooserLabel: string; blurb: string; cta: string }
> = {
  merchant: {
    label: 'Merchant',
    chooserLabel: "I'm a Merchant",
    blurb: 'Deploy an AI commerce agent for my fashion store.',
    cta: 'Deploy Your Agent',
  },
  customer: {
    label: 'Shopper',
    chooserLabel: "I'm a Shopper",
    blurb: 'Shop with AI-powered fashion agents.',
    cta: 'Start Shopping',
  },
}
