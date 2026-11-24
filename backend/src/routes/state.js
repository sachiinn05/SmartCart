/**
 * state.js - persistence routes. Only mounted behaviour-wise when a store exists;
 * with no database configured every route answers { enabled: false } and the app stays in-memory.
 *
 *   GET    /api/state      -> { enabled, rules, cartItems }
 *   PUT    /api/rules      { rules }
 *   PUT    /api/cart       { items }
 *   POST   /api/history    { itemCount, subtotal, cartOffer, finalTotal, items }
 *   GET    /api/history    -> { enabled, history }
 *   DELETE /api/state      clears this browser's saved data
 *
 * Everything from the client is untrusted: it is rebuilt field by field, never stored as-is.
 */

import { Router } from 'express'

const SID_RE = /^[A-Za-z0-9-]{8,64}$/
const SCOPES = ['brand', 'platform', 'cart']
const TYPES = ['percentage', 'flat']

const str = (v, max) => (typeof v === 'string' && v.length <= max ? v : null)
const posNum = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 1e9 ? v : null)
const nonNegNum = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1e9 ? v : null)

export function cleanRules(input) {
  if (!Array.isArray(input) || input.length > 100) return null
  const out = []
  for (const r of input) {
    const ruleId = str(r?.ruleId, 30)
    const appliesTo = typeof r?.appliesTo === 'string' ? str(r.appliesTo, 100) : ''
    const value = posNum(r?.value)
    if (!ruleId || appliesTo === null || !SCOPES.includes(r.scope) || !TYPES.includes(r.type) || value === null) return null
    const rule = { ruleId, scope: r.scope, appliesTo, type: r.type, value, stackable: r.stackable === true }
    if (r.scope === 'cart') {
      const min = nonNegNum(r.minCartValue)
      if (min === null) return null
      rule.minCartValue = min
    }
    out.push(rule)
  }
  return out
}

export function cleanItems(input) {
  if (!Array.isArray(input) || input.length > 200) return null
  const out = []
  for (const i of input) {
    const item = {
      itemId: str(i?.itemId, 30),
      product: str(i?.product, 150),
      brand: str(i?.brand, 100),
      platform: str(i?.platform, 100),
      basePrice: posNum(i?.basePrice),
    }
    if (Object.values(item).some((v) => v === null || v === '')) return null
    out.push(item)
  }
  return out
}

function cleanHistory(b) {
  const items = Array.isArray(b?.items) && b.items.length <= 200 ? b.items : null
  const itemCount = nonNegNum(b?.itemCount)
  const subtotal = nonNegNum(b?.subtotal)
  const finalTotal = nonNegNum(b?.finalTotal)
  if (!items || itemCount === null || subtotal === null || finalTotal === null) return null

  let cartOffer = null
  if (b.cartOffer) {
    const label = str(b.cartOffer.label, 100)
    const saving = nonNegNum(b.cartOffer.saving)
    if (label === null || saving === null) return null
    cartOffer = { label, saving }
  }
  const cleaned = []
  for (const i of items) {
    const row = { itemId: str(i?.itemId, 30), product: str(i?.product, 150), finalPrice: nonNegNum(i?.finalPrice), reasoning: str(i?.reasoning, 300) }
    if (Object.values(row).some((v) => v === null)) return null
    cleaned.push(row)
  }
  return { itemCount, subtotal, cartOffer, finalTotal, items: cleaned }
}

export function createStateRouter(store) {
  const router = Router()

  // No database configured: report it, do nothing.
  if (!store) {
    router.get('/state', (_req, res) => res.json({ enabled: false, rules: [], cartItems: [] }))
    router.get('/history', (_req, res) => res.json({ enabled: false, history: [] }))
    router.all(['/rules', '/cart', '/history', '/state'], (_req, res) => res.json({ enabled: false }))
    return router
  }

  router.use((req, res, next) => {
    const sid = req.get('x-session-id')
    if (!sid || !SID_RE.test(sid)) return res.status(400).json({ status: 'error', message: 'Missing or invalid session id.' })
    req.sid = sid
    next()
  })

  const guard = (fn) => async (req, res) => {
    try {
      await fn(req, res)
    } catch (err) {
      console.error('Persistence error:', err.message)
      res.status(500).json({ status: 'error', message: 'Could not reach the database.' })
    }
  }

  router.get('/state', guard(async (req, res) => res.json({ enabled: true, ...(await store.getState(req.sid)) })))

  router.put('/rules', guard(async (req, res) => {
    const rules = cleanRules(req.body?.rules)
    if (!rules) return res.status(400).json({ status: 'error', message: 'Invalid rules.' })
    await store.saveRules(req.sid, rules)
    res.json({ enabled: true, saved: rules.length })
  }))

  router.put('/cart', guard(async (req, res) => {
    const items = cleanItems(req.body?.items)
    if (!items) return res.status(400).json({ status: 'error', message: 'Invalid cart items.' })
    await store.saveCart(req.sid, items)
    res.json({ enabled: true, saved: items.length })
  }))

  router.post('/history', guard(async (req, res) => {
    const entry = cleanHistory(req.body)
    if (!entry) return res.status(400).json({ status: 'error', message: 'Invalid history entry.' })
    await store.addHistory(req.sid, entry)
    res.json({ enabled: true })
  }))

  router.get('/history', guard(async (req, res) => res.json({ enabled: true, history: await store.listHistory(req.sid, 20) })))

  router.delete('/state', guard(async (req, res) => {
    await store.clear(req.sid)
    res.json({ enabled: true, cleared: true })
  }))

  return router
}
