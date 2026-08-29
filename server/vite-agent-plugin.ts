import type { Connect, Plugin, ViteDevServer } from 'vite'
import { handleAgentChat } from './agent/handler'
import { handleCheckout } from './agent/checkout'

type Handler = (
  body: unknown,
  authHeader: string | undefined,
  env: Record<string, string>,
) => Promise<{ status: number; body: unknown }>

/**
 * Dev-only: serves the agent endpoints from the Vite dev server so they run in
 * Node (OpenAI key + signing secret never touch the browser). In production the
 * same handlers run as serverless functions (see api/agent/*.js, built by
 * `npm run build:fn`).
 */
export function agentApiPlugin(env: Record<string, string>): Plugin {
  const route =
    (server: ViteDevServer, fn: Handler, label: string): Connect.NextHandleFunction =>
    async (req, res) => {
      res.setHeader('content-type', 'application/json')
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.end(JSON.stringify({ ok: false, error: 'bad_request', message: 'POST only.' }))
        return
      }
      try {
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const raw = Buffer.concat(chunks).toString('utf8') || '{}'
        const result = await fn(JSON.parse(raw), req.headers['authorization'], env)
        res.statusCode = result.status
        res.end(JSON.stringify(result.body))
      } catch (err) {
        server.config.logger.error(
          `[${label}] ${err instanceof Error ? err.message : String(err)}`,
        )
        res.statusCode = 200
        res.end(
          JSON.stringify({ ok: false, error: 'server', message: 'The agent hit an error.' }),
        )
      }
    }

  return {
    name: 'styleself-agent-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/agent/chat', route(server, handleAgentChat, 'agent-api'))
      server.middlewares.use(
        '/api/agent/checkout',
        route(server, handleCheckout, 'agent-checkout'),
      )
    },
  }
}
