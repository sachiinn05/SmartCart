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

describe('discounts never exceed the item price', () => {
  const flat500 = { ruleId: 'R', scope: 'brand', appliesTo: 'Kraft & Co', type: 'flat', value: 500, stackable: false }
  const item = { itemId: 'I1', product: 'Pen Stand', brand: 'Kraft & Co', platform: 'Meesho', basePrice: 399 }

  it('a Rs.500 flat offer on a Rs.399 item gives Rs.0, not a negative price', () => {
    const r = calculateCart([item], [flat500]).items[0]
    expect(r.finalPrice).toBe(0)
    expect(r.totalDiscount).toBe(399)
  })
  it('the offer text states the real saving, not the headline value', () => {
    const r = calculateCart([item], [flat500]).items[0]
    expect(r.reasoning).toContain('Rs.399 off')
    expect(r.reasoning).toContain('limited to the item price')
  })
  it('a flat offer smaller than the price reads normally', () => {
    const r = calculateCart([{ ...item, basePrice: 1000 }], [flat500]).items[0]
    expect(r.finalPrice).toBe(500)
    expect(r.reasoning).toBe('Brand offer: Rs.500 off')
  })
  it('a stackable flat offer cannot push an already-discounted price below zero', () => {
    const stack = { ruleId: 'S', scope: 'platform', appliesTo: 'Meesho', type: 'flat', value: 75, stackable: true }
    const r = calculateCart([{ ...item, basePrice: 99 }], [flat500, stack]).items[0]
    expect(r.finalPrice).toBe(0)
  })
})

describe('tough rules file with 45 items', () => {
  const toughRules = parseRulesCSV(fs.readFileSync(path.join(dir, 'rules-tough.csv'), 'utf8')).data
  const bigCart = parseCartCSV(fs.readFileSync(path.join(dir, 'cart-large.csv'), 'utf8')).data
  const out = calculateCart(bigCart, toughRules)

  it('parses 12 rules and 45 items with no errors', () => {
    expect(toughRules).toHaveLength(12)
    expect(bigCart).toHaveLength(45)
  })
  it('no item ever has a negative final price', () => {
    expect(out.items.every((i) => i.finalPrice >= 0)).toBe(true)
  })
  it('picks the larger of two cart rules and stacks the stackable one', () => {
    expect(out.offer.ruleIds).toEqual(['RULE-11', 'RULE-12'])
  })
  it('higher-% brand beats platform: LivSpace 18% over Amazon 15%', () => {
    const shelf = out.items.find((i) => i.itemId === 'ITEM-05') // Rs.449 LivSpace Pro on Amazon India
    expect(shelf.finalPrice).toBe(449 - Math.round(449 * 0.18))
  })
  it('an item with no matching rule says so', () => {
    expect(out.items.find((i) => i.itemId === 'ITEM-04').reasoning).toBe('No offers available')
  })
})

