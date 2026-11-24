/**
 * HistoryPanel.jsx - past calculations for this browser (only shown when a database is connected).
 */

const inr = (v) => `Rs.${v.toLocaleString('en-IN')}`

export default function HistoryPanel({ history, onClear }) {
  return (
    <div>
      {history.length === 0 ? (
        <div style={{ fontSize: 12, color: '#888' }}>No calculations saved yet.</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #CECECE', borderRadius: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#131A48', color: '#fff' }}>
                {['When', 'Items', 'Before cart offer', 'Cart offer', 'Final total'].map((h) => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h.id ?? i} style={{ background: i % 2 ? '#fafafa' : '#fff', borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px 10px' }}>{new Date(h.createdAt).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '6px 10px' }}>{h.itemCount}</td>
                  <td style={{ padding: '6px 10px' }}>{inr(h.subtotal)}</td>
                  <td style={{ padding: '6px 10px', color: h.cartOffer ? '#1e5c2c' : '#888' }}>
                    {h.cartOffer ? `${h.cartOffer.label} (−${inr(h.cartOffer.saving)})` : '—'}
                  </td>
                  <td style={{ padding: '6px 10px', fontWeight: 700 }}>{inr(h.finalTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        type="button"
        onClick={onClear}
        style={{ marginTop: 10, background: '#fff', color: '#8a1a1a', border: '1px solid #e57373', borderRadius: 4, padding: '0.35rem 0.9rem', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
      >
        Clear my saved data
      </button>
    </div>
  )
}
