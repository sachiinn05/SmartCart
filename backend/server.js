import 'dotenv/config'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import rulesRouter from './src/routes/rules.js'
import cartRouter from './src/routes/cart.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50kb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true, llm: Boolean(process.env.GROQ_API_KEY) }))
app.use('/api', rulesRouter)
app.use('/api', cartRouter)

// Production: serve the built frontend from the same service (one Render web service).
const dist = path.resolve(__dirname, '../frontend/dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, () => {
  const note = process.env.GROQ_API_KEY ? '' : ' (no GROQ_API_KEY: rule parsing uses the keyword fallback)'
  console.log(`SmartCart running on :${PORT}${note}`)
})
