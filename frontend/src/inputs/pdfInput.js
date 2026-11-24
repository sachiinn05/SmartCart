import { parsePdfRequest } from './api.js'
import { knownNames } from './nlRuleInput.js'

export async function parseCartFromPdf(file, rules, cartItems) {
  const out = await parsePdfRequest(file, knownNames(rules, cartItems))
  return { items: out.items ?? [], errors: out.errors ?? [] }
}
