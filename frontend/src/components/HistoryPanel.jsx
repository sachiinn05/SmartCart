const inr = (v) => `Rs.${v.toLocaleString('en-IN')}`

export default function HistoryPanel({ history, onClear }) {
  return (
    <details className="history">
      <summary>History ({history.length})</summary>
      {history.length === 0 ? (
        <p className="hint">Nothing saved yet.</p>
      ) : (
        <ul>
          {history.map((h, i) => (
            <li key={h.id ?? i}>
              <span>
                {new Date(h.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}, {h.itemCount} items
              </span>
              <b>{inr(h.finalTotal)}</b>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn danger" onClick={onClear}>
        Clear saved data
      </button>
    </details>
  )
}
