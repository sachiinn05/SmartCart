/**
 * store.js - optional server-side persistence.
 *
 * Every function is safe to call when no database is configured: the server answers
 * { enabled: false } and these helpers become no-ops. Failures never throw into the UI.
 * The visitor is identified by a random id kept in this browser's localStorage.
 */

const KEY = 'smartcart-session'

export function getSessionId() {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return null // storage blocked: persistence quietly off
  }
}

async function call(method, path, body) {
  const sid = getSessionId()
  if (!sid) return { enabled: false }
  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-session-id': sid },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) return { enabled: true, failed: true }
    return await res.json()
  } catch {
    return { enabled: false, failed: true }
  }
}

export const loadState = () => call('GET', '/state')
export const saveRules = (rules) => call('PUT', '/rules', { rules })
export const saveCart = (items) => call('PUT', '/cart', { items })
export const loadHistory = () => call('GET', '/history')
export const clearSaved = () => call('DELETE', '/state')

export function saveHistory(results) {
  return call('POST', '/history', {
    itemCount: results.items.length,
    subtotal: results.subtotal,
    cartOffer: results.offer ? { label: results.offer.label, saving: results.offer.saving } : null,
    finalTotal: results.finalTotal,
    items: results.items.map((i) => ({
      itemId: i.itemId,
      product: i.product,
      finalPrice: i.finalPrice,
      reasoning: i.reasoning,
    })),
  })
}
