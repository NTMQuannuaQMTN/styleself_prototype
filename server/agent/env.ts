export type AgentEnv = {
  openaiApiKey: string
  model: string
  supabaseUrl: string
  supabaseAnonKey: string
  /** HMAC secret for checkout draft / authorization tokens. Set in production. */
  signingSecret: string
}

/** Dev fallback so /agent/demo works with no config. Production MUST set AGENT_SIGNING_SECRET. */
const DEV_SIGNING_SECRET = 'styleself-dev-unsafe-signing-secret'

type RawEnv = Record<string, string | undefined>

/** Pull agent config out of a raw env bag (process.env or Vite's loadEnv result). */
export function readAgentEnv(raw: RawEnv): AgentEnv {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k]
      if (v && v.trim()) return v.trim()
    }
    return ''
  }

  return {
    openaiApiKey: pick('OPENAI_API_KEY'),
    model: pick('AI_MODEL') || 'gpt-4o-mini',
    supabaseUrl: pick(
      'SUPABASE_URL',
      'VITE_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
    ),
    supabaseAnonKey: pick(
      'SUPABASE_ANON_KEY',
      'VITE_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ),
    signingSecret: pick('AGENT_SIGNING_SECRET') || DEV_SIGNING_SECRET,
  }
}
