import { CloseIcon } from './icons.jsx'

const inr = (v) => `Rs.${v.toLocaleString('en-IN')}`

function amount(rule) {
  return rule.type === 'percentage' ? `${rule.value}% off` : `${inr(rule.value)} off`
}

export default function RuleList({ rules, onRemove }) {
  if (rules.length === 0) return null
  return (
    <>
      <div className="list-head">
        {rules.length} rule{rules.length > 1 ? 's' : ''} active
      </div>
      <ul className="rules">
        {rules.map((r) => (
          <li key={r.ruleId} className={`rule scope-${r.scope}`}>
            <div className="rule-top">
              <span className="scope-tag">{r.scope}</span>
              {r.stackable && <span className="stack-tag">stacks</span>}
              <button type="button" className="x" title="Remove rule" onClick={() => onRemove(r.ruleId)}>
                <CloseIcon />
              </button>
            </div>
            <div className="rule-main">{amount(r)}</div>
            <div className="rule-sub">
              {r.scope === 'cart' ? `on carts over ${inr(r.minCartValue)}` : r.appliesTo}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
