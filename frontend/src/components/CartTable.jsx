import { useMemo, useState } from 'react'

const inr = (v) => `Rs.${v.toLocaleString('en-IN')}`

function chips(reasoning) {
  return reasoning.split(' + ').map((part) => {
    const kind = part.startsWith('Brand') ? 'brand' : part.startsWith('Cart') ? 'cart' : 'platform'
    return { kind, text: part.replace(/^(Brand|Platform|Cart) offer: /, '') }
  })
}

export default function CartTable({ items, results }) {
  const [query, setQuery] = useState('')
  const [onlyOffers, setOnlyOffers] = useState(false)

  const rows = results ?? items
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (onlyOffers && !(r.totalDiscount > 0)) return false
      if (!q) return true
      return `${r.product} ${r.brand} ${r.platform}`.toLowerCase().includes(q)
    })
  }, [rows, query, onlyOffers])

  return (
    <div className="table-card">
      <div className="toolbar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search product, brand or platform"
        />
        {results && (
          <label className="check">
            <input type="checkbox" checked={onlyOffers} onChange={(e) => setOnlyOffers(e.target.checked)} />
            Only items with an offer
          </label>
        )}
        {results && (
          <span className="legend">
            <i className="platform" /> Platform
            <i className="brand" /> Brand
            <i className="cart" /> Cart
          </span>
        )}
        <span className="shown">
          {shown.length} of {rows.length}
        </span>
      </div>

      <table className="items">
        <thead>
          <tr>
            <th>Product</th>
            <th>{results ? 'Offer applied' : 'Platform'}</th>
            <th className="right">Price</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => {
            const saved = results ? r.totalDiscount : 0
            const percent = saved > 0 ? Math.round((saved / r.basePrice) * 100) : 0
            return (
              <tr key={r.itemId}>
                <td>
                  <div className="product">{r.product}</div>
                  <div className="meta">
                    {r.brand} <span>on</span> {r.platform}
                  </div>
                </td>
                <td>
                  {!results && <span className="plain">{r.platform}</span>}
                  {results && saved === 0 && <span className="plain">No offers available</span>}
                  {results && saved > 0 && (
                    <div className="offer-chips">
                      {chips(r.reasoning).map((c, i) => (
                        <span key={i} className={`chip ${c.kind}`}>
                          {c.text}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="price">
                  <div>
                    {saved > 0 && <s>{inr(r.basePrice)}</s>}
                    <b>{inr(results ? r.finalPrice : r.basePrice)}</b>
                  </div>
                  {saved > 0 && (
                    <div className="saved">
                      <span className="pill">{percent}% off</span> save {inr(saved)}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
          {shown.length === 0 && (
            <tr>
              <td colSpan="3" className="none">
                No items match.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
