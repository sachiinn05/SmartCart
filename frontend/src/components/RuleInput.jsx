/**
 * RuleInput.jsx
 *
 * Plain-English rule entry with a confirmation step.
 * Nothing is added to the rule list until the user confirms the parsed fields.
 */

import { useState } from 'react'
import { parseRuleFromText } from '../inputs/nlRuleInput.js'

const EXAMPLES = [
  '20% off for Natura Casa brand, stackable with other offers',
  'Rs.100 flat discount on all Flipkart items',
  '10% off if cart value is more than Rs.5,000',
]

const label = { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }

function Field({ name, value }) {
  return (
    <div style={{ minWidth: 90 }}>
      <div style={label}>{name}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#131A48' }}>{value}</div>
    </div>
  )
}

export function describeRuleFields(rule) {
  const fields = [['Scope', rule.scope.charAt(0).toUpperCase() + rule.scope.slice(1)]]
  if (rule.scope !== 'cart') fields.push(['Applies to', rule.appliesTo])
  fields.push(['Type', rule.type === 'percentage' ? 'Percentage' : 'Flat'])
  fields.push(['Value', rule.type === 'percentage' ? `${rule.value}%` : `Rs.${rule.value}`])
  fields.push(['Stackable', rule.stackable ? 'Yes' : 'No'])
  if (rule.scope === 'cart') fields.push(['Min cart value', `Rs.${rule.minCartValue.toLocaleString('en-IN')}`])
  return fields
}

export default function RuleInput({ rules, cartItems, onConfirm }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(null) // { rule, warnings, source }
  const [message, setMessage] = useState('')

  async function handleParse() {
    setLoading(true)
    setMessage('')
    setPending(null)
    try {
      const out = await parseRuleFromText(text, rules, cartItems)
      if (out.status === 'ok') setPending(out)
      else setMessage(out.message)
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  function confirm() {
    onConfirm(pending.rule)
    setPending(null)
    setText('')
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='e.g. "20% off for Natura Casa brand, stackable with other offers"'
        rows={2}
        maxLength={300}
        style={{ width: '100%', border: '1px solid #CECECE', borderRadius: 4, padding: '0.6rem', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => setText(ex)} style={{ fontSize: 11, background: '#f2f2f6', border: '1px solid #e0e0e8', borderRadius: 20, padding: '2px 10px', cursor: 'pointer', color: '#131A48' }}>
            {ex}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handleParse}
        disabled={loading || !text.trim()}
        style={{ background: loading || !text.trim() ? '#CECECE' : '#131A48', color: '#fff', border: 'none', borderRadius: 4, padding: '0.5rem 1.2rem', fontSize: 12, fontWeight: 700, cursor: loading || !text.trim() ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Reading…' : 'Parse rule'}
      </button>

      {message && (
        <div style={{ marginTop: 10, background: '#fff6e5', border: '1px solid #f0c36d', borderLeft: '3px solid #e08a00', borderRadius: 4, padding: '0.6rem 0.9rem', fontSize: 12, color: '#5a3d00' }}>
          <strong>Couldn't create a rule.</strong> {message}
        </div>
      )}

      {pending && (
        <div style={{ marginTop: 10, border: '1px solid #131A48', borderRadius: 6, padding: '0.9rem 1rem', background: '#f7f8ff' }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#131A48', marginBottom: 8 }}>
            Confirm new rule {pending.rule.ruleId}
            <span style={{ fontWeight: 400, color: '#888', marginLeft: 8 }}>
              {pending.source === 'llm' ? 'read by AI' : 'read by keyword matching (AI unavailable)'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
            {describeRuleFields(pending.rule).map(([n, v]) => (
              <Field key={n} name={n} value={v} />
            ))}
          </div>
          {pending.warnings?.map((w) => (
            <div key={w} style={{ fontSize: 12, color: '#8a5a00', marginTop: 8 }}>⚠ {w}</div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={confirm} style={{ background: '#FF5800', color: '#fff', border: 'none', borderRadius: 4, padding: '0.45rem 1.2rem', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Add rule
            </button>
            <button type="button" onClick={() => setPending(null)} style={{ background: '#fff', color: '#131A48', border: '1px solid #CECECE', borderRadius: 4, padding: '0.45rem 1.2rem', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
