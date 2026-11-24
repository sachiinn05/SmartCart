const inr = (v) => `Rs.${v.toLocaleString('en-IN')}`

export default function HistoryPanel({ history, onClear }) {
  return (
    <section className="card history">
      <div className="card-head">
        <h2>Past calculations</h2>
        <button type="button" className="btn ghost danger" onClick={onClear}>
          Clear saved data
        </button>
      </div>
      {history.length === 0 ? (
        <p className="muted">Your calculations will show up here.</p>
      ) : (
        <ul>
          {history.map((h, i) => (
            <li key={h.id ?? i}>
              <span>{new Date(h.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              <span>{h.itemCount} items</span>
              <span className="muted">{h.cartOffer ? `cart offer: ${h.cartOffer.label}` : 'no cart offer'}</span>
              <b>{inr(h.finalTotal)}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
