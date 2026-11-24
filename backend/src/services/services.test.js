import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateRule } from './ruleValidator.js'
import { keywordParse } from './ruleParser.js'
import { parseCartText } from './pdfCartParser.js'

const ctx = { brands: ['Natura Casa', 'LivSpace Pro'], platforms: ['Amazon India', 'Flipkart', 'Noon'] }

// ── validator ──
test('validator canonicalises casing and accepts a good rule', () => {
  const r = validateRule({ scope: 'brand', appliesTo: 'natura casa', type: 'percentage', value: 20, stackable: true }, ctx)
  assert.equal(r.ok, true)
  assert.equal(r.rule.appliesTo, 'Natura Casa')
})
test('validator rejects >100% and missing fields', () => {
  assert.equal(validateRule({ scope: 'brand', appliesTo: 'X', type: 'percentage', value: 150 }, ctx).ok, false)
  assert.equal(validateRule({ scope: 'cart', type: 'percentage', value: 10 }, ctx).ok, false)
  assert.equal(validateRule({ scope: 'moon', type: 'flat', value: 5 }, ctx).ok, false)
  assert.equal(validateRule(null, ctx).ok, false)
})
test('validator warns when the brand is not in the cart', () => {
  const r = validateRule({ scope: 'brand', appliesTo: 'Ghost Co', type: 'flat', value: 50 }, ctx)
  assert.equal(r.ok, true)
  assert.equal(r.warnings.length, 1)
})

// ── keyword fallback: the three examples + the ambiguous one from the brief ──
test('fallback: brand percentage stackable', () => {
  const r = keywordParse('20% off for Natura Casa brand, stackable with other offers', ctx)
  assert.deepEqual([r.scope, r.appliesTo, r.type, r.value, r.stackable], ['brand', 'Natura Casa', 'percentage', 20, true])
})
test('fallback: platform flat', () => {
  const r = keywordParse('Rs.100 flat discount on all Flipkart items', ctx)
  assert.deepEqual([r.scope, r.appliesTo, r.type, r.value, r.stackable], ['platform', 'Flipkart', 'flat', 100, false])
})
test('fallback: cart threshold', () => {
  const r = keywordParse('10% off if cart value is more than Rs.5,000', ctx)
  assert.deepEqual([r.scope, r.type, r.value, r.minCartValue], ['cart', 'percentage', 10, 5000])
})
test('fallback: ambiguous input is unresolvable, not guessed', () => {
  const r = keywordParse('Give a discount for big orders', ctx)
  assert.equal(r.resolvable, false)
  assert.match(r.reason, /specify/i)
})
test('fallback: "non-stackable" is not read as stackable', () => {
  const r = keywordParse('15% off Noon, non-stackable', ctx)
  assert.equal(r.stackable, false)
})

// ── PDF rows ──
test('pdf: tab/space separated table parses all 6 rows', () => {
  const text = [
    'Order #OP-9921\t|\tDate: 15 Jan 2025',
    'Product\tBrand\tPlatform\tBase Price',
    '──────────',
    'Cushion Cover\tNatura Casa\tAmazon India\tRs.1,299',
    'Bed Sheet Set\tNatura Casa\tFlipkart\tRs.849',
    'Wall Shelf\tLivSpace Pro\tAmazon India\tRs.599',
    'Ceramic Vase\tLivSpace Pro\tNoon\tRs.2,499',
    'Cutting Board\tNordic Basics\tAmazon India\tRs.449',
    'Desk Organiser\tNordic Basics\tFlipkart\tRs.899',
  ].join('\n')
  const { items, errors } = parseCartText(text)
  assert.equal(errors.length, 0)
  assert.equal(items.length, 6)
  assert.equal(items[0].basePrice, 1299)
  assert.equal(items[3].platform, 'Noon')
})
test('pdf: single-spaced text falls back to known platforms/brands', () => {
  const { items, errors } = parseCartText('Cushion Cover Natura Casa Amazon India Rs.1,299', ctx)
  assert.equal(errors.length, 0)
  assert.deepEqual([items[0].product, items[0].brand, items[0].platform], ['Cushion Cover', 'Natura Casa', 'Amazon India'])
})
test('pdf: a malformed row is reported, valid rows still load', () => {
  const { items, errors } = parseCartText('Good Item\tBrand A\tNoon\tRs.100\nBroken row with no columns Rs.50\nZero\tB\tNoon\tRs.0')
  assert.equal(items.length, 1)
  assert.equal(errors.length, 2)
})
test('pdf: no table at all gives a helpful error', () => {
  const { items, errors } = parseCartText('hello world')
  assert.equal(items.length, 0)
  assert.match(errors[0], /Expected a table/)
})
