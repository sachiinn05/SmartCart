import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../app.js'
import { createMemoryStore } from '../persistence/memoryStore.js'

const rule = { ruleId: 'RULE-01', scope: 'platform', appliesTo: 'Amazon India', type: 'percentage', value: 15, stackable: false }
const cartRule = { ruleId: 'RULE-04', scope: 'cart', appliesTo: '', type: 'percentage', value: 10, stackable: false, minCartValue: 4000 }
const item = { itemId: 'ITEM-01', product: 'Cushion Cover', brand: 'Natura Casa', platform: 'Amazon India', basePrice: 1299 }

let withDb, noDb, urlA, urlB
before(async () => {
  withDb = createApp(createMemoryStore()).listen(0)
  noDb = createApp(null).listen(0)
  urlA = `http://localhost:${withDb.address().port}/api`
  urlB = `http://localhost:${noDb.address().port}/api`
})
after(() => { withDb.close(); noDb.close() })

const call = (base, method, path, body, sid = 'visitor-aaaa-1111') =>
  fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(sid ? { 'x-session-id': sid } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, body: await r.json() }))

test('rules and cart round-trip', async () => {
  assert.equal((await call(urlA, 'PUT', '/rules', { rules: [rule, cartRule] })).status, 200)
  assert.equal((await call(urlA, 'PUT', '/cart', { items: [item] })).status, 200)
  const s = await call(urlA, 'GET', '/state')
  assert.equal(s.body.enabled, true)
  assert.deepEqual(s.body.rules, [rule, cartRule])
  assert.deepEqual(s.body.cartItems, [item])
})

test('visitors cannot see each other\'s data', async () => {
  const other = await call(urlA, 'GET', '/state', null, 'visitor-bbbb-2222')
  assert.deepEqual(other.body.rules, [])
  assert.deepEqual(other.body.cartItems, [])
})

test('missing or malformed session id is rejected', async () => {
  assert.equal((await call(urlA, 'GET', '/state', null, null)).status, 400)
  assert.equal((await call(urlA, 'GET', '/state', null, 'bad id!!')).status, 400)
})

test('invalid payloads are rejected, not stored', async () => {
  assert.equal((await call(urlA, 'PUT', '/rules', { rules: [{ ...rule, scope: 'moon' }] })).status, 400)
  assert.equal((await call(urlA, 'PUT', '/rules', { rules: [{ ...cartRule, minCartValue: undefined }] })).status, 400)
  assert.equal((await call(urlA, 'PUT', '/rules', { rules: 'nope' })).status, 400)
  assert.equal((await call(urlA, 'PUT', '/cart', { items: [{ ...item, basePrice: -5 }] })).status, 400)
  const s = await call(urlA, 'GET', '/state')
  assert.equal(s.body.rules.length, 2)
})

test('extra fields from the client are dropped', async () => {
  await call(urlA, 'PUT', '/cart', { items: [{ ...item, $where: 'evil', admin: true }] })
  const s = await call(urlA, 'GET', '/state')
  assert.deepEqual(Object.keys(s.body.cartItems[0]).sort(), ['basePrice', 'brand', 'itemId', 'platform', 'product'])
})

test('history saves newest first and validates', async () => {
  const entry = (n) => ({ itemCount: 1, subtotal: n, cartOffer: null, finalTotal: n, items: [{ itemId: 'ITEM-01', product: 'X', finalPrice: n, reasoning: 'No offers available' }] })
  await call(urlA, 'POST', '/history', entry(100))
  await call(urlA, 'POST', '/history', { ...entry(200), cartOffer: { label: '10% off', saving: 20 } })
  assert.equal((await call(urlA, 'POST', '/history', { itemCount: 'x' })).status, 400)
  const h = await call(urlA, 'GET', '/history')
  assert.equal(h.body.history.length, 2)
  assert.equal(h.body.history[0].finalTotal, 200)
})

test('DELETE clears only this visitor', async () => {
  await call(urlA, 'PUT', '/cart', { items: [item] }, 'visitor-bbbb-2222')
  await call(urlA, 'DELETE', '/state')
  assert.deepEqual((await call(urlA, 'GET', '/state')).body.cartItems, [])
  assert.equal((await call(urlA, 'GET', '/history')).body.history.length, 0)
  assert.equal((await call(urlA, 'GET', '/state', null, 'visitor-bbbb-2222')).body.cartItems.length, 1)
})

test('without a database every route reports enabled:false', async () => {
  assert.equal((await call(urlB, 'GET', '/state', null, null)).body.enabled, false)
  assert.equal((await call(urlB, 'PUT', '/rules', { rules: [rule] }, null)).body.enabled, false)
  const h = await fetch(urlB.replace('/api', '') + '/api/health').then((r) => r.json())
  assert.equal(h.database, false)
})
