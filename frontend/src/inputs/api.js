async function request(url, options) {
  let res
  try {
    res = await fetch(url, options)
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.')
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || `Request failed (${res.status})`)
  return body
}

export function parseRuleRequest(text, context) {
  return request('/api/parse-rule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, context }),
  })
}

export function parsePdfRequest(file, context) {
  const form = new FormData()
  form.append('file', file)
  form.append('brands', JSON.stringify(context.brands ?? []))
  form.append('platforms', JSON.stringify(context.platforms ?? []))
  return request('/api/parse-pdf', { method: 'POST', body: form })
}
