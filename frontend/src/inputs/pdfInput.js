/**
 * pdfInput.js - "PDF cart" input mode.
 *
 * Adapts an uploaded PDF -> CartItem[]. Knows nothing about how discounts are calculated.
 * Returns { items, errors } where errors lists rows that were skipped.
 */

import { parsePdfRequest } from './api.js'
import { knownNames } from './nlRuleInput.js'

export async function parseCartFromPdf(file, rules, cartItems) {
  const out = await parsePdfRequest(file, knownNames(rules, cartItems))
  return { items: out.items ?? [], errors: out.errors ?? [] }
}
