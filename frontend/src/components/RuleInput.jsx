import { useState } from 'react'
import { parseRuleFromText } from '../inputs/nlRuleInput.js'
import { SparkIcon } from './icons.jsx'

const EXAMPLES = [
  '20% off for Natura Casa brand, stackable with other offers',
  'Rs.100 flat discount on all Flipkart items',
  '10% off if cart value is more than Rs.5,000',
]

function fields(rule) {
  const rows = [['Type', rule.scope[0].toUpperCase() + rule.scope.slice(1)]]
  if (rule.scope !== 'cart') rows.push(['Applies to', rule.appliesTo])
  rows.push(['Discount', rule.type === 'percentage' ? `${rule.value}%` : `Rs.${rule.value}`])
  rows.push(['Stacks with others', rule.stackable ? 'Yes' : 'No'])
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
    <div className="nl">
      <label className="nl-label" htmlFor="rule-text">
        <SparkIcon /> Or just type a rule
      </label>
      <form className="nl-form" onSubmit={handleParse}>
        <input
          id="rule-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 20% off Natura Casa, stackable"
          maxLength={300}
        />
        <button type="submit" className="btn indigo" disabled={loading || !text.trim()}>
          {loading ? 'Reading...' : 'Add rule'}
        </button>
      </form>

      <div className="try">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="try-chip" onClick={() => setText(ex)}>
            {ex}
          </button>
        ))}
      </div>

      {message && <div className="alert amber">{message}</div>}

      {pending && (
        <div className="confirm">
          <div className="confirm-title">
            Does this look right?
            <span>{pending.source === 'llm' ? 'understood by AI' : 'understood by keyword match'}</span>
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
            <div key={w} className="alert amber">
              {w}
            </div>
          ))}
          <div className="actions">
            <button type="button" className="btn green" onClick={confirm}>
              Yes, add it
            </button>
            <button type="button" className="btn ghost" onClick={() => setPending(null)}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
