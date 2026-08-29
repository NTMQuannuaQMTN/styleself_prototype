import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types'
import {
  emptyContext,
  type AgentBranding,
  type AgentRequest,
  type AgentResponse,
} from '../../src/agent/types'
import { readAgentEnv } from './env'
import { DbCatalog, DemoCatalog, type Catalog, type Loc } from './catalog'
import type { MerchantConfig } from './prompt'
import { runTurn } from './runtime'

const DEMO_GREETING = 'Hi — what are you shopping for today?'

type EnvBag = Record<string, string | undefined>

/**
 * Core agent endpoint logic, framework-agnostic.
 * `authHeader` is forwarded to Supabase so an authenticated merchant can preview
 * a not-yet-published agent; anonymous callers only reach live agents.
 */
export async function handleAgentChat(
  body: unknown,
  authHeader: string | undefined,
  rawEnv: EnvBag,
): Promise<{ status: number; body: AgentResponse }> {
  const env = readAgentEnv(rawEnv)

  const req = body as Partial<AgentRequest>
  const agentId = typeof req?.agentId === 'string' ? req.agentId.trim() : ''
  if (!agentId) {
    return {
      status: 400,
      body: { ok: false, error: 'bad_request', message: 'Missing agentId.' },
    }
  }
  const messages = Array.isArray(req.messages) ? req.messages : []
  const context = req.context ?? emptyContext()
  const conversationId =
    typeof req.conversationId === 'string' ? req.conversationId : 'anon'

  // ---- resolve merchant context ----
  let catalog: Catalog
  let config: MerchantConfig
  let branding: AgentBranding

  if (agentId === 'demo') {
    catalog = new DemoCatalog()
    config = {
      storeName: 'Urban Thread',
      branchName: 'Orchard',
      tone: 'Premium but approachable',
      currency: 'USD',
      recommendationLimit: 4,
      rules:
        'Only recommend in-stock products. Free pickup, $5 delivery. Prefer the shopper’s chosen location.',
      locationNames: catalog.locations.map((l) => l.name),
      multiLocation: true,
    }
    branding = {
      storeName: config.storeName,
      branchName: config.branchName,
      agentName: 'StyleSelf',
      greeting: DEMO_GREETING,
      currency: 'USD',
      multiLocation: true,
      locations: config.locationNames,
      live: true,
      preview: false,
    }
  } else {
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      return {
        status: 500,
        body: {
          ok: false,
          error: 'not_configured',
          message: 'The agent backend is not configured.',
        },
      }
    }
    const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: authHeader ? { headers: { Authorization: authHeader } } : {},
    })

    const storeRes = await supabase
      .from('stores')
      .select('*')
      .eq('slug', agentId)
      .maybeSingle()

    if (storeRes.error) {
      console.error(`[agent ${conversationId}] store lookup failed`, storeRes.error)
      return {
        status: 500,
        body: {
          ok: false,
          error: 'server',
          message: 'Could not load this store right now. Try again shortly.',
        },
      }
    }
    const store = storeRes.data

    if (!store) {
      return {
        status: 404,
        body: {
          ok: false,
          error: 'not_found',
          message: 'No agent found at this address.',
        },
      }
    }

    const [{ data: agentRow }, { data: locRows }] = await Promise.all([
      supabase.from('store_agents').select('*').eq('store_id', store.id).maybeSingle(),
      supabase
        .from('store_locations')
        .select('id, name, is_primary')
        .eq('store_id', store.id)
        .order('is_primary', { ascending: false }),
    ])

    const locations: Loc[] = (locRows ?? []).map((l) => ({
      id: l.id,
      name: l.name,
    }))
    const currency = agentRow?.currency ?? 'USD'
    const preview = !store.agent_live // only members can see a draft store at all

    catalog = new DbCatalog(supabase, store.id, currency, locations)
    config = {
      storeName: store.name,
      branchName: store.branch_name,
      tone: agentRow?.tone ?? 'Warm, concise, style-aware',
      currency,
      recommendationLimit: clampLimit(agentRow?.recommendation_limit),
      rules: agentRow?.rules ?? null,
      locationNames: locations.map((l) => l.name),
      multiLocation: locations.length > 1,
    }
    branding = {
      storeName: store.name,
      branchName: store.branch_name,
      agentName: agentRow?.display_name ?? 'StyleSelf',
      greeting: agentRow?.greeting ?? 'What are you looking for today?',
      currency,
      multiLocation: locations.length > 1,
      locations: locations.map((l) => l.name),
      live: store.agent_live,
      preview,
    }
  }

  // ---- opening the conversation: no model call ----
  if (messages.length === 0) {
    return {
      status: 200,
      body: {
        ok: true,
        agent: branding,
        message: branding.greeting,
        action: { type: 'none' },
        context,
      },
    }
  }

  if (!env.openaiApiKey) {
    return {
      status: 200,
      body: {
        ok: true,
        agent: branding,
        message:
          "This agent isn't fully set up yet — the shopping assistant is offline.",
        action: { type: 'none' },
        context,
      },
    }
  }

  // ---- run the turn ----
  try {
    const openai = new OpenAI({ apiKey: env.openaiApiKey })
    const out = await runTurn(openai, env.model, {
      messages,
      context,
      catalog,
      config,
    })
    return { status: 200, body: { ok: true, agent: branding, ...out } }
  } catch (err) {
    console.error(`[agent ${conversationId}]`, err)
    return {
      status: 200,
      body: {
        ok: true,
        agent: branding,
        message:
          "Sorry — I hit a snag reaching the assistant. Try that again in a moment.",
        action: { type: 'none' },
        context,
      },
    }
  }
}

function clampLimit(v: unknown): number {
  const n = typeof v === 'number' ? v : 5
  return Math.min(8, Math.max(1, Math.round(n)))
}
