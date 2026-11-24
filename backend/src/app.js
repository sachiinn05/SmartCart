import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import rulesRouter from './routes/rules.js'
import cartRouter from './routes/cart.js'
import { createStateRouter } from './routes/state.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createApp(store = null) {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '300kb' }))

  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, llm: Boolean(process.env.GROQ_API_KEY), database: store ? store.kind : false })
  )
  app.use('/api', rulesRouter)
  app.use('/api', cartRouter)
  app.use('/api', createStateRouter(store))

  const dist = path.resolve(__dirname, '../../frontend/dist')
  if (fs.existsSync(dist)) {
    app.use(express.static(dist))
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
  }
  return app
}
