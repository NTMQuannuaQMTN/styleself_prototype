import type { Plugin } from 'vite'
import { handleAgentChat } from './agent/handler'

/**
 * Dev-only: serves POST /api/agent/chat from the Vite dev server so the agent
 * runs in Node (OpenAI key never touches the browser). In production the same
 * `handleAgentChat` runs as a serverless function (see api/agent/chat.ts).
 */
export function agentApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'styleself-agent-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/agent/chat', async (req, res) => {
        res.setHeader('content-type', 'application/json')
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(
            JSON.stringify({
              ok: false,
              error: 'bad_request',
              message: 'POST only.',
            }),
          )
          return
        }
        try {
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const raw = Buffer.concat(chunks).toString('utf8') || '{}'
          const result = await handleAgentChat(
            JSON.parse(raw),
            req.headers['authorization'],
            env,
          )
          res.statusCode = result.status
          res.end(JSON.stringify(result.body))
        } catch (err) {
          server.config.logger.error(
            `[agent-api] ${err instanceof Error ? err.message : String(err)}`,
          )
          res.statusCode = 200
          res.end(
            JSON.stringify({
              ok: false,
              error: 'server',
              message: 'The agent hit an error.',
            }),
          )
        }
      })
    },
  }
}
