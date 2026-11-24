const inr = (v) => `Rs.${v.toLocaleString('en-IN')}`

export default function OrderSummary({ results, baseTotal }) {
  const itemSavings = baseTotal - results.subtotal
  const totalSaved = baseTotal - results.finalTotal
  const percent = baseTotal > 0 ? Math.round((totalSaved / baseTotal) * 100) : 0
  const { nearMiss, offer } = results

  return (
    <aside className="summary">
      <h2>Order summary</h2>
      <div className="line">
        <span className="what">Items ({results.items.length})</span>
        <span>{inr(baseTotal)}</span>
      </div>
      {itemSavings > 0 && (
        <div className="line good">
          <span className="what">Item offers</span>
          <span>-{inr(itemSavings)}</span>
        </div>
      )}
      {offer && (
        <div className="line good">
          <span className="what">Cart offer: {offer.label}</span>
          <span>-{inr(offer.saving)}</span>
        </div>
      )}
      <div className="total">
        <span>Total</span>
        <span>{inr(results.finalTotal)}</span>
      </div>
      {totalSaved > 0 && (
        <div className="saving">
          You save {inr(totalSaved)} ({percent}%)
        </div>
      )}
      {!offer && nearMiss && (
        <div className="nudge">
          Add {inr(nearMiss.shortBy)} more to get{' '}
          {nearMiss.rule.type === 'percentage' ? `${nearMiss.rule.value}% off` : `${inr(nearMiss.rule.value)} off`} your
          cart ({inr(nearMiss.rule.minCartValue)} minimum).
        </div>
      )}
    </aside>
  )
}
