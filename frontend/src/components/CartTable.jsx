const inr = (v) => `Rs.${v.toLocaleString('en-IN')}`

export default function CartTable({ items, results }) {
  const rows = results ?? items
  return (
    <table className="items">
      <thead>
        <tr>
          <th>Product</th>
          <th>{results ? 'Offer applied' : 'Platform'}</th>
          <th style={{ textAlign: 'right' }}>Price</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const saved = results ? r.totalDiscount : 0
          const offer = results ? r.reasoning : r.platform
          const none = results && saved === 0
          return (
            <tr key={r.itemId}>
              <td>
                <div className="product">{r.product}</div>
                <div className="meta">
                  {r.brand} on {r.platform}
                </div>
                {results && <div className={`offer-inline ${none ? 'none' : ''}`}>{offer}</div>}
              </td>
              <td className={`offer ${none ? 'none' : ''}`}>{offer}</td>
              <td className="price">
                {saved > 0 && <s>{inr(r.basePrice)}</s>}
                <b>{inr(results ? r.finalPrice : r.basePrice)}</b>
                {saved > 0 && <div className="saved">You save {inr(saved)}</div>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
