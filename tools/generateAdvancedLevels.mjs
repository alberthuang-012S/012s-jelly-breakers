import { createServer } from 'vite'
// Keep authoring SSR from replacing the running app's dependency cache.
const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-authoring', server: { middlewareMode: true }, appType: 'custom' })
try { await server.ssrLoadModule('/tools/generateAdvancedLevels.ts') }
finally { await server.close() }
