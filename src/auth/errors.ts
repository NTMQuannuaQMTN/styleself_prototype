/** Turn a Supabase auth error into something a person can act on. */
export function authErrorMessage(error: unknown): string {
  const raw =
    (typeof error === 'object' &&
      error &&
      'message' in error &&
      String((error as { message: unknown }).message)) ||
    ''
  const msg = raw.toLowerCase()

  if (msg.includes('invalid login credentials')) {
    return 'That email and password don’t match. Try again or reset your password.'
  }
  if (msg.includes('email not confirmed')) {
    return 'Confirm your email first — check your inbox for the link we sent.'
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'An account with this email already exists. Try logging in instead.'
  }
  if (msg.includes('password should be at least')) {
    return 'Choose a password with at least 8 characters.'
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  if (msg.includes('for security purposes')) {
    return 'Please wait a moment before requesting another email.'
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Network problem — check your connection and try again.'
  }
  return raw || 'Something went wrong. Please try again.'
}

/** Only allow same-origin path redirects from the `next` query param. */
export function safeNextPath(next: string | null): string | null {
  if (!next) return null
  if (!next.startsWith('/') || next.startsWith('//')) return null
  return next
}
