/**
 * discountEngine.js
 *
 * Pure discount calculation logic. No UI, no side effects.
 * All functions take plain objects and return plain objects.
 *
 * Data shapes:
 *
 * DiscountRule {
 *   ruleId:    string       — e.g. "RULE-01"
 *   scope:     "brand" | "platform" | "cart"
 *   appliesTo: string       — e.g. "Natura Casa", "Amazon India"
 *   type:      "percentage" | "flat"
 *   value:     number       — percentage as integer (15 = 15%), flat in rupees
 *   stackable: boolean
 *   minCartValue?: number   — cart rules only: threshold on the sum of final item prices
 * }
 *
 * CartItem {
 *   itemId:    string       — e.g. "ITEM-01"
 *   product:   string
 *   brand:     string
 *   platform:  string
 *   basePrice: number       — in rupees
 * }
 *
 * DiscountResult {
 *   itemId:        string
 *   product:       string
 *   brand:         string
 *   platform:      string
 *   basePrice:     number
 *   finalPrice:    number
 *   totalDiscount: number
 *   appliedRules:  string[]
 *   skippedRules:  string[]
 *   reasoning:     string   — customer-readable explanation
 * }
 */

/**
 * Returns true if the rule applies to this cart item.
 */
export function ruleMatchesItem(item, rule) {
  const normalise = (s) => s.trim().toLowerCase()
  if (rule.scope === 'brand') {
    return normalise(item.brand) === normalise(rule.appliesTo)
  }
  if (rule.scope === 'platform') {
    return normalise(item.platform) === normalise(rule.appliesTo)
  }
  return false
}

/**
 * Calculates the rupee discount a rule gives on a given price.
 * Uses the provided price, not the original base price — important for stacking.
 */
export function calculateDiscountAmount(price, rule) {
  if (rule.type === 'percentage') {
    return Math.round(price * rule.value / 100)
  }
  if (rule.type === 'flat') {
    return rule.value
  }
  return 0
}

/**
 * Builds the customer-facing reasoning string for an applied rule.
 */
export function ruleToReasoning(rule) {
  const scopeLabel = rule.scope === 'brand' ? 'Brand' : rule.scope === 'cart' ? 'Cart' : 'Platform'
  if (rule.type === 'percentage') {
    return `${scopeLabel} offer: ${rule.value}% off`
  }
  if (rule.type === 'flat') {
    return `${scopeLabel} offer: Rs.${rule.value} off`
  }
  return `${scopeLabel} offer applied`
}

/**
 * Applies the active discount rules to a single cart item.
 * Returns a DiscountResult.
 *
 * Logic:
 *   1. Find all rules that match this item.
 *   2. Among non-stackable rules, pick the one giving the largest discount.
 *   3. Apply any stackable rules on top of that price.
 *   4. Build the reasoning string from what was applied.
 */
export function applyDiscounts(item, rules) {
  const matchingRules = rules.filter((r) => ruleMatchesItem(item, r))

  // No rules match — return base price with explanation
  if (matchingRules.length === 0) {
    return {
      itemId: item.itemId,
      product: item.product,
      brand: item.brand,
      platform: item.platform,
      basePrice: item.basePrice,
      finalPrice: item.basePrice,
      totalDiscount: 0,
      appliedRules: [],
      skippedRules: [],
      reasoning: 'No offers available',
    }
  }

  const nonStackable = matchingRules.filter((r) => !r.stackable)
  const stackable = matchingRules.filter((r) => r.stackable)

  // Pick the non-stackable rule that gives the largest saving
  let winner = null
  let skipped = []

  if (nonStackable.length > 0) {
    const sorted = [...nonStackable].sort(
      (a, b) =>
        calculateDiscountAmount(item.basePrice, b) -
        calculateDiscountAmount(item.basePrice, a)
    )
    winner = sorted[0]
    skipped = sorted.slice(1)
  }

  // Apply winner first, then stack on top
  let price = item.basePrice
  const appliedRules = []
  const reasoningParts = []

  if (winner) {
    price -= calculateDiscountAmount(price, winner)
    appliedRules.push(winner.ruleId)
    reasoningParts.push(ruleToReasoning(winner))
  }

  for (const rule of stackable) {
    price -= calculateDiscountAmount(price, rule)
    appliedRules.push(rule.ruleId)
    reasoningParts.push(ruleToReasoning(rule))
  }

  const finalPrice = Math.round(price)

  return {
    itemId: item.itemId,
    product: item.product,
    brand: item.brand,
    platform: item.platform,
    basePrice: item.basePrice,
    finalPrice,
    totalDiscount: item.basePrice - finalPrice,
    appliedRules,
    skippedRules: skipped.map((r) => r.ruleId),
    reasoning: reasoningParts.join(' + '),
  }
}

/**
 * Runs applyDiscounts across every item in the cart.
 * Returns an array of DiscountResult objects.
 */
export function processCart(cartItems, rules) {
  return cartItems.map((item) => applyDiscounts(item, rules))
}

/**
 * Sums the final prices across all results.
 */
export function cartTotal(results) {
  return results.reduce((sum, r) => sum + r.finalPrice, 0)
}

/**
 * Evaluates cart-level rules against the already-discounted item results.
 *
 * - Threshold is checked against the sum of FINAL item prices (post item offers).
 * - Among eligible non-stackable cart rules the largest saving wins.
 * - Eligible stackable cart rules apply on top of the winner.
 * - If no cart rule is eligible, `offer` is null and `nearMiss` describes the
 *   closest unmet rule so the UI can nudge the customer ("add Rs.X more").
 *
 * Returns { subtotal, offer, finalTotal, nearMiss }
 *   offer: { ruleIds, saving, label } | null
 */
export function applyCartRules(results, rules) {
  const subtotal = cartTotal(results)
  const cartRules = rules.filter((r) => r.scope === 'cart')

  const eligible = cartRules.filter((r) => subtotal >= (r.minCartValue ?? 0))
  const unmet = cartRules.filter((r) => subtotal < (r.minCartValue ?? 0))

  let nearMiss = null
  if (unmet.length > 0) {
    const closest = [...unmet].sort((a, b) => a.minCartValue - b.minCartValue)[0]
    nearMiss = { ruleId: closest.ruleId, shortBy: closest.minCartValue - subtotal, rule: closest }
  }

  if (eligible.length === 0) {
    return { subtotal, offer: null, finalTotal: subtotal, nearMiss }
  }

  const nonStackable = eligible.filter((r) => !r.stackable)
  const stackable = eligible.filter((r) => r.stackable)
  const winner = nonStackable.length
    ? [...nonStackable].sort(
        (a, b) => calculateDiscountAmount(subtotal, b) - calculateDiscountAmount(subtotal, a)
      )[0]
    : null

  let total = subtotal
  const ruleIds = []
  const labels = []
  for (const rule of [winner, ...stackable].filter(Boolean)) {
    total -= calculateDiscountAmount(total, rule)
    ruleIds.push(rule.ruleId)
    labels.push(
      rule.type === 'percentage' ? `${rule.value}% off` : `Rs.${rule.value} off`
    )
  }
  total = Math.max(0, Math.round(total))

  return {
    subtotal,
    offer: { ruleIds, saving: subtotal - total, label: labels.join(' + ') },
    finalTotal: total,
    nearMiss,
  }
}

/**
 * Full pipeline: item-level discounts, then the cart-level offer.
 * This is the single entry point the UI (and every input mode) should call.
 */
export function calculateCart(cartItems, rules) {
  const items = processCart(cartItems, rules)
  return { items, ...applyCartRules(items, rules) }
}
