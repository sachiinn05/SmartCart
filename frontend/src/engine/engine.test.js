import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parseRulesCSV, parseCartCSV } from './csvParser.js'
import { calculateCart } from './discountEngine.js'

const dir = path.resolve(__dirname, '../../../sample-data')
const rules = parseRulesCSV(fs.readFileSync(path.join(dir, 'rules.csv'), 'utf8')).data
const cart = parseCartCSV(fs.readFileSync(path.join(dir, 'cart.csv'), 'utf8')).data

describe('assignment expected results', () => {
  const out = calculateCart(cart, rules)
  const finals = out.items.map((i) => i.finalPrice)

  it('item level prices', () => {
    expect(finals).toEqual([1104, 629, 509, 2499, 382, 809])
  })
  it('ITEM-04 explains there is no offer', () => {
    expect(out.items[3].reasoning).toBe('No offers available')
  })
  it('cart offer fires on 5,932 and gives 593 off', () => {
    expect(out.subtotal).toBe(5932)
    expect(out.offer.saving).toBe(593)
    expect(out.finalTotal).toBe(5339)
  })
})

describe('cart rule edge cases', () => {
  it('does not trigger just below the threshold and reports how far off', () => {
    const items = [{ itemId: 'I1', product: 'X', brand: 'B', platform: 'Noon', basePrice: 3999 }]
    const out = calculateCart(items, rules)
    expect(out.offer).toBeNull()
    expect(out.finalTotal).toBe(3999)
    expect(out.nearMiss.shortBy).toBe(1)
  })
  it('triggers exactly at the threshold', () => {
    const items = [{ itemId: 'I1', product: 'X', brand: 'B', platform: 'Noon', basePrice: 4000 }]
    expect(calculateCart(items, rules).finalTotal).toBe(3600)
  })
  it('a cart rule is never applied to an individual item', () => {
    const items = [{ itemId: 'I1', product: 'X', brand: 'B', platform: 'Noon', basePrice: 100 }]
    expect(calculateCart(items, rules).items[0].finalPrice).toBe(100)
  })
  it('a newly added brand rule is picked up on re-run', () => {
    const extra = { ruleId: 'RULE-05', scope: 'brand', appliesTo: 'Nordic Basics', type: 'percentage', value: 20, stackable: true }
    const out = calculateCart(cart, [...rules, extra])
    expect(out.items[4].finalPrice).toBeLessThan(382) // stacks on top of the 15%
  })
})

describe('csv parsing of cart rules', () => {
  it('rejects a cart rule without min_cart_value', () => {
    const { errors } = parseRulesCSV('rule_id,scope,applies_to,type,value,stackable,min_cart_value\nR1,cart,,percentage,10,false,')
    expect(errors[0]).toMatch(/min_cart_value/)
  })
})
