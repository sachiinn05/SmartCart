import { useState } from 'react'
import { parseRuleFromText } from '../inputs/nlRuleInput.js'

const EXAMPLES = [
  '20% off for Natura Casa brand, stackable with other offers',
  'Rs.100 flat discount on all Flipkart items',
  '10% off if cart value is more than Rs.5,000',
]

function fields(rule) {
  const rows = [['Scope', rule.scope[0].toUpperCase() + rule.scope.slice(1)]]
  if (rule.scope !== 'cart') rows.push(['Applies to', rule.appliesTo])
  rows.push(['Discount', rule.type === 'percentage' ? `${rule.value}%` : `Rs.${rule.value}`])
  rows.push(['Stackable', rule.stackable ? 'Yes' : 'No'])
  if (rule.scope === 'cart') rows.push(['Minimum cart', `Rs.${rule.minCartValue.toLocaleString('en-IN')}`])
  return rows
}

export default function RuleInput({ rules, cartItems, onConfirm }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(null)
  const [message, setMessage] = useState('')

  async function handleParse(e) {
    e.preventDefault()
    if (!text.trim() || loading) return
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
      <form className="rule-form" onSubmit={handleParse}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe a rule in plain English"
          maxLength={300}
        />
        <button type="submit" className="btn dark" disabled={loading || !text.trim()}>
          {loading ? 'Reading...' : 'Add'}
        </button>
      </form>

      <ul className="examples">
        {EXAMPLES.map((ex) => (
          <li key={ex}>
            <button type="button" onClick={() => setText(ex)}>
              {ex}
            </button>
          </li>
        ))}
      </ul>

      {message && <div className="note">{message}</div>}

      {pending && (
        <div className="confirm">
          <div className="title">
            Add {pending.rule.ruleId}?
            <span>{pending.source === 'llm' ? 'read by AI' : 'read by keyword match'}</span>
          </div>
          <dl>
            {fields(pending.rule).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {pending.warnings?.map((w) => (
            <div key={w} className="warn">
              {w}
            </div>
          ))}
          <div className="actions">
            <button type="button" className="btn primary" onClick={confirm}>
              Confirm
            </button>
            <button type="button" className="btn" onClick={() => setPending(null)}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
