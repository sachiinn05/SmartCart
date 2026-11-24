const inr = (v) => `Rs.${v.toLocaleString('en-IN')}`

export default function OrderSummary({ results, baseTotal }) {
  const itemSavings = baseTotal - results.subtotal
  const totalSaved = baseTotal - results.finalTotal
  const percent = baseTotal > 0 ? Math.round((totalSaved / baseTotal) * 100) : 0
  const { nearMiss, offer } = results

  return (
    <aside className="summary">
      <div className="sum-head">Order summary</div>

      <div className="sum-lines">
        <div className="line">
          <span>Items ({results.items.length})</span>
          <span>{inr(baseTotal)}</span>
        </div>
        {itemSavings > 0 && (
          <div className="line good">
            <span>Item offers</span>
            <span>-{inr(itemSavings)}</span>
          </div>
        )}
        {offer && (
          <div className="line good">
            <span>Cart offer ({offer.label})</span>
            <span>-{inr(offer.saving)}</span>
          </div>
        )}
      </div>

      <div className="sum-total">
        <span>You pay</span>
        <b>{inr(results.finalTotal)}</b>
      </div>

      {totalSaved > 0 && (
        <div className="sum-saved">
          You saved {inr(totalSaved)} <span>({percent}% off)</span>
        </div>
      )}

      {!offer && nearMiss && (
        <div className="alert amber">
          Add {inr(nearMiss.shortBy)} more to get{' '}
          {nearMiss.rule.type === 'percentage' ? `${nearMiss.rule.value}% off` : `${inr(nearMiss.rule.value)} off`} the
          whole cart ({inr(nearMiss.rule.minCartValue)} minimum).
        </div>
      )}
    </aside>
  )
}
