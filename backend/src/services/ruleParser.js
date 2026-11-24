import { validateRule } from './ruleValidator.js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You convert a shop owner's plain-English discount description into JSON.
Reply with ONE JSON object and nothing else.

If the description gives enough information, reply:
{"resolvable": true, "scope": "brand"|"platform"|"cart", "appliesTo": string|null,
 "type": "percentage"|"flat", "value": number, "stackable": boolean, "minCartValue": number|null}

Rules:
- scope "brand": discount for one brand; "platform": for one marketplace/platform; "cart": for the whole cart, requires a minimum cart value.
- appliesTo is the brand or platform name (null for cart). Prefer the exact spelling from the KNOWN lists when it matches.
- percentage: value is the number only (20 for 20%). flat: value is rupees.
- stackable is true only if the text says it stacks/combines with other offers; otherwise false.
- minCartValue only for cart scope, in rupees.

A rule has ONE target: a brand, OR a platform, OR the whole cart with a minimum value. It cannot combine them
(e.g. "25% off Nykaa Home only if cart is above 50000" is NOT supported), and the text must describe exactly ONE rule
(not "20% off X and 15% off Y"). In those cases reply resolvable false and explain in the reason.

If a value, a target, or a cart threshold is missing or vague (e.g. "a discount for big orders"), reply:
{"resolvable": false, "reason": "<one short sentence telling the user what to specify>"}
Never invent numbers or names.`



async function askLlm(text, ctx) {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY not set')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        temperature: 0,
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `KNOWN brands: ${JSON.stringify(ctx.brands ?? [])}\nKNOWN platforms: ${JSON.stringify(
              ctx.platforms ?? []
            )}\n\nDescription: ${text}`,
          },
        ],
      }),
    })
    if (!res.ok) throw new Error(`Groq responded ${res.status}`)
    const data = await res.json()
    return JSON.parse(data.choices?.[0]?.message?.content ?? '')
  } finally {
    clearTimeout(timer)
  }
}



const NUM = '([\\d][\\d,]*(?:\\.\\d+)?)'
const RUPEE = '(?:rs\\.?|₹|inr)\\s*'
const num = (s) => Number(s.replace(/,/g, ''))

export function keywordParse(text, ctx = {}) {
  let t = text.toLowerCase()


  let minCartValue = null
  const thr =
    t.match(
      new RegExp(
        `(?:more than|above|over|at least|minimum(?: of)?|min\\.?|exceeds?|greater than|>=?|≥)\\s*(?:cart\\s*(?:value|total)?\\s*(?:of)?\\s*)?(?:${RUPEE})?${NUM}`
      )
    ) ??

    t.match(new RegExp(`(?:${RUPEE})?${NUM}\\s*(?:or more|or above|and above|and up|and over|\\+)`))
  if (thr) {
    minCartValue = num(thr[1])
    t = t.replace(thr[0], ' ')
  }


  let type = null
  let value = null
  const pct = t.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/)
  const flat = t.match(new RegExp(`${RUPEE}${NUM}|${NUM}\\s*(?:rs\\.?|rupees|₹)`))
  if (pct) {
    type = 'percentage'
    value = Number(pct[1])
  } else if (flat) {
    type = 'flat'
    value = num(flat[1] ?? flat[2])
  }


  const values = new Set([
    ...[...t.matchAll(/(\d+(?:\.\d+)?)\s*(?:%|percent)/g)].map((m) => `p${m[1]}`),
    ...[...t.matchAll(new RegExp(`${RUPEE}${NUM}|${NUM}\\s*(?:rs\\.?|rupees|₹)`, 'g'))].map((m) => `r${m[1] ?? m[2]}`),
  ])
  if (values.size > 1) {
    return { resolvable: false, reason: 'That describes more than one discount. Add them one rule at a time.' }
  }


  const findKnown = (list = []) => list.find((n) => t.includes(n.toLowerCase()))
  const brand = findKnown(ctx.brands)
  const platform = findKnown(ctx.platforms)
  let scope = null
  let appliesTo = null
  if (minCartValue !== null && (brand || platform)) {
    return {
      resolvable: false,
      reason: `A rule can apply to ${brand || platform} or to the cart total, not both. Add them as separate rules.`,
    }
  }
  if (minCartValue !== null && /cart|order|basket|total|value/.test(text.toLowerCase())) {
    scope = 'cart'
  } else if (brand) {
    scope = 'brand'
    appliesTo = brand
  } else if (platform) {
    scope = 'platform'
    appliesTo = platform
  }

  if (!type || !scope) {
    const missing = []
    if (!type) missing.push('the discount amount (e.g. "10%" or "Rs.100")')
    if (!scope) {
      missing.push('who it applies to (a brand, a platform, or a cart minimum like "if cart is above Rs.5,000")')
    }
    return { resolvable: false, reason: `Please specify ${missing.join(' and ')}.` }
  }

  const negated = /non[- ]?stackable|not stackable|no stack|cannot stack|can.t stack/.test(t)
  const stackable = /stackable|stacks?\b|combine/.test(t) && !negated
  return { resolvable: true, scope, appliesTo, type, value, stackable, minCartValue }
}



function finish(raw, ctx, source) {
  if (raw.resolvable === false) {
    return {
      status: 'unresolvable',
      message: raw.reason || 'Please be more specific about the discount.',
      source,
    }
  }
  const v = validateRule(raw, ctx)
  if (!v.ok) return { status: 'invalid', errors: v.errors, source }
  return { status: 'ok', rule: v.rule, warnings: v.warnings, source }
}

export async function parseRuleText(text, ctx = {}) {
  const input = String(text ?? '').trim()
  if (!input) {
    return { status: 'unresolvable', message: 'Describe the discount you want to add.', source: 'none' }
  }
  if (input.length > 300) {
    return { status: 'unresolvable', message: 'Please keep the description under 300 characters.', source: 'none' }
  }

  try {
    const raw = await askLlm(input, ctx)
    const out = finish(raw, ctx, 'llm')
    if (out.status !== 'invalid') return out
    console.warn('LLM returned an invalid rule, using keyword fallback:', out.errors)
  } catch (err) {
    console.warn('LLM unavailable, using keyword fallback:', err.message)
  }

  const out = finish(keywordParse(input, ctx), ctx, 'fallback')
  if (out.status === 'invalid') {
    return {
      status: 'unresolvable',
      message: `Could not build a valid rule: ${out.errors.join('; ')}.`,
      source: 'fallback',
    }
  }
  return out
}
