const inr = (v) => `Rs.${v.toLocaleString('en-IN')}`

function describe(rule) {
  const amount = rule.type === 'percentage' ? `${rule.value}% off` : `${inr(rule.value)} off`
  if (rule.scope === 'cart') return `Whole cart, ${amount} over ${inr(rule.minCartValue)}`
  return `${rule.appliesTo}, ${amount}`
}

export default function RuleList({ rules }) {
  if (rules.length === 0) return null
  return (
    <>
      <div className="count">
        {rules.length} rule{rules.length > 1 ? 's' : ''} active
      </div>
      <ul className="rule-list">
        {rules.map((r) => (
          <li key={r.ruleId}>
            <span className="id">{r.ruleId}</span>
            <span>
              {describe(r)}
              <span className="tag">
                {r.scope}
                {r.stackable ? ', stackable' : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
