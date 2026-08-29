import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { agentApiPlugin } from './server/vite-agent-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // load every var (no prefix) so the agent middleware can read OPENAI_API_KEY etc.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), agentApiPlugin(env)],
  }
})
