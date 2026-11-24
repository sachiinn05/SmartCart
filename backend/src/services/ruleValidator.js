const SCOPES = ['brand', 'platform', 'cart']
const TYPES = ['percentage', 'flat']

function canonical(name, known = []) {
  const wanted = String(name).trim().toLowerCase()
  return known.find((k) => k.trim().toLowerCase() === wanted) ?? String(name).trim()
}

function toNumber(v) {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v.replace(/[^\d.]/g, ''))
  return NaN
}

export function validateRule(raw, ctx = {}) {
  const errors = []
  const warnings = []

  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['Rule is not an object'], warnings }
  }

  const scope = String(raw.scope ?? '').toLowerCase()
  if (!SCOPES.includes(scope)) errors.push(`scope must be one of ${SCOPES.join(', ')}`)

  const type = String(raw.type ?? '').toLowerCase()
  if (!TYPES.includes(type)) errors.push(`type must be one of ${TYPES.join(', ')}`)

  const value = toNumber(raw.value)
  if (!Number.isFinite(value) || value <= 0) errors.push('value must be a positive number')
  else if (type === 'percentage' && value > 100) errors.push('a percentage discount cannot exceed 100%')

  if (type === 'percentage' && value === 100) warnings.push('100% off makes matching items free')

  const stackable = raw.stackable === true || raw.stackable === 'true'

  let appliesTo = ''
  let minCartValue
  if (scope === 'brand' || scope === 'platform') {
    if (!raw.appliesTo || !String(raw.appliesTo).trim()) {
      errors.push(`a ${scope} rule needs a ${scope} name`)
    } else {
      const known = scope === 'brand' ? ctx.brands : ctx.platforms
      appliesTo = canonical(raw.appliesTo, known)
      if (known?.length && !known.some((k) => k.trim().toLowerCase() === appliesTo.toLowerCase())) {
        warnings.push(
          `"${appliesTo}" does not match any ${scope} in the current cart, so it will not change any price yet`
        )
      }
    }
  } else if (scope === 'cart') {
    minCartValue = toNumber(raw.minCartValue)
    if (!Number.isFinite(minCartValue) || minCartValue <= 0) {
      errors.push('a cart rule needs a minimum cart value')
    }
  }

  if (errors.length) return { ok: false, errors, warnings }

  const rule = { scope, appliesTo, type, value, stackable }
  if (scope === 'cart') rule.minCartValue = minCartValue
  return { ok: true, rule, errors, warnings }
}
