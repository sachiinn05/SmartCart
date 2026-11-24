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


export function calculateDiscountAmount(price, rule) {
  let amount = 0
  if (rule.type === 'percentage') amount = Math.round(price * rule.value / 100)
  else if (rule.type === 'flat') amount = rule.value
  return Math.max(0, Math.min(price, amount))
}


export function ruleToReasoning(rule, saved = rule.value) {
  const scopeLabel = rule.scope === 'brand' ? 'Brand' : rule.scope === 'cart' ? 'Cart' : 'Platform'
  if (rule.type === 'percentage') {
    return `${scopeLabel} offer: ${rule.value}% off`
  }
  if (rule.type === 'flat') {
    return saved < rule.value
      ? `${scopeLabel} offer: Rs.${saved} off (Rs.${rule.value} offer, limited to the item price)`
      : `${scopeLabel} offer: Rs.${rule.value} off`
  }
  return `${scopeLabel} offer applied`
}


export function applyDiscounts(item, rules) {
  const matchingRules = rules.filter((r) => ruleMatchesItem(item, r))


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


  let price = item.basePrice
  const appliedRules = []
  const reasoningParts = []

  for (const rule of [winner, ...stackable]) {
    if (!rule) continue
    const saved = calculateDiscountAmount(price, rule)
    price -= saved
    appliedRules.push(rule.ruleId)
    reasoningParts.push(ruleToReasoning(rule, saved))
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


export function processCart(cartItems, rules) {
  return cartItems.map((item) => applyDiscounts(item, rules))
}


export function cartTotal(results) {
  return results.reduce((sum, r) => sum + r.finalPrice, 0)
}


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


export function calculateCart(cartItems, rules) {
  const items = processCart(cartItems, rules)
  return { items, ...applyCartRules(items, rules) }
}
