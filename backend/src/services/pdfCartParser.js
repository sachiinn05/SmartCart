import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

export async function extractPdfText(buffer) {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise

  const out = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const { items } = await page.getTextContent()
    const rows = []
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue
      const y = it.transform[5]
      const row = rows.find((r) => Math.abs(r.y - y) < 3)
      const cell = { x: it.transform[4], w: it.width, str: it.str }
      if (row) row.cells.push(cell)
      else rows.push({ y, cells: [cell] })
    }
    rows.sort((a, b) => b.y - a.y)
    for (const row of rows) {
      row.cells.sort((a, b) => a.x - b.x)
      let line = ''
      let prevEnd = null
      for (const c of row.cells) {
        if (prevEnd !== null) line += c.x - prevEnd > 8 ? '\t' : ' '
        line += c.str.trim()
        prevEnd = c.x + c.w
      }
      out.push(line)
    }
  }
  await doc.destroy()
  return out.join('\n')
}

const PRICE_RE = /(?:rs\.?|₹|inr)\s*([\d,]+(?:\.\d+)?)\s*(?:\/-)?\s*$/i
const HEADER_RE = /^\s*product\s+brand\s+platf\s*orm/i
const DEFAULT_PLATFORMS = ['Amazon India', 'Flipkart', 'Noon']

function stripPrice(line) {
  const m = line.match(PRICE_RE)
  if (!m) return null
  return { price: Number(m[1].replace(/,/g, '')), rest: line.slice(0, m.index).trim() }
}

function splitByKnown(rest, known) {
  const platforms = [...new Set([...DEFAULT_PLATFORMS, ...(known.platforms ?? [])])].sort(
    (a, b) => b.length - a.length
  )
  const lower = rest.toLowerCase()
  const platform = platforms.find((p) => lower.endsWith(p.toLowerCase()))
  if (!platform) return null
  const before = rest.slice(0, rest.length - platform.length).trim()
  const brand = [...(known.brands ?? [])]
    .sort((a, b) => b.length - a.length)
    .find((b) => before.toLowerCase().endsWith(b.toLowerCase()))
  if (!brand) return null
  const product = before.slice(0, before.length - brand.length).trim()
  return product ? [product, before.slice(before.length - brand.length), platform] : null
}

export function parseCartText(text, known = {}) {
  const items = []
  const errors = []
  const lines = text.split(/\r?\n/)

  lines.forEach((raw, idx) => {
    const line = raw.replace(/ /g, ' ').trim()
    if (!line) return
    if (HEADER_RE.test(line)) return
    if (/^[\s─\-—_=]+$/.test(line)) return
    if (/^order\s*#/i.test(line)) return

    const priced = stripPrice(line)
    if (!priced) return

    if (!(priced.price > 0)) {
      errors.push(`Line ${idx + 1}: price must be greater than 0 ("${line}")`)
      return
    }

    let cells = priced.rest
      .split(/\t+|\s{2,}/)
      .map((c) => c.trim())
      .filter(Boolean)
    if (cells.length !== 3) cells = splitByKnown(priced.rest, known) ?? cells
    if (cells.length !== 3) {
      errors.push(`Line ${idx + 1}: could not read Product / Brand / Platform ("${line}")`)
      return
    }

    items.push({
      itemId: `ITEM-${String(items.length + 1).padStart(2, '0')}`,
      product: cells[0],
      brand: cells[1],
      platform: cells[2],
      basePrice: Math.round(priced.price),
    })
  })

  if (items.length === 0 && errors.length === 0) {
    errors.push('No cart rows found. Expected a table with columns: Product, Brand, Platform, Base Price.')
  }
  return { items, errors }
}
