/**
 * nlRuleInput.js - "natural language rule" input mode.
 *
 * Adapts free text -> DiscountRule. Knows nothing about how discounts are calculated.
 * Returns { status: 'ok', rule, warnings, source } | { status: 'unresolvable', message }.
 */

import { parseRuleRequest } from './api.js'

export function nextRuleId(rules) {
  const max = rules.reduce((m, r) => {
    const n = Number(String(r.ruleId).replace(/\D/g, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `RULE-${String(max + 1).padStart(2, '0')}`
}

/** Brand / platform names already known from the cart and rules (helps the LLM match spelling). */
export function knownNames(rules, cartItems) {
  const uniq = (xs) => [...new Set(xs.filter(Boolean))]
  return {
    brands: uniq([...cartItems.map((i) => i.brand), ...rules.filter((r) => r.scope === 'brand').map((r) => r.appliesTo)]),
    platforms: uniq([
      ...cartItems.map((i) => i.platform),
      ...rules.filter((r) => r.scope === 'platform').map((r) => r.appliesTo),
    ]),
  }
}

export async function parseRuleFromText(text, rules, cartItems) {
  const out = await parseRuleRequest(text, knownNames(rules, cartItems))
  if (out.status === 'ok') {
    return { ...out, rule: { ruleId: nextRuleId(rules), ...out.rule } }
  }
  if (out.status === 'unresolvable') return out
  return { status: 'unresolvable', message: out.message || 'That description could not be turned into a rule.' }
}
