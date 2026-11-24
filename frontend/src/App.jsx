import { useEffect, useMemo, useRef, useState } from 'react'
import CsvUploader from './components/CsvUploader.jsx'
import PdfUploader from './components/PdfUploader.jsx'
import RuleInput from './components/RuleInput.jsx'
import DataTable from './components/DataTable.jsx'
import ErrorBanner from './components/ErrorBanner.jsx'
import { parseRulesCSV, parseCartCSV } from './engine/csvParser.js'
import HistoryPanel from './components/HistoryPanel.jsx'
import { calculateCart } from './engine/discountEngine.js'
import { loadState, saveRules, saveCart, saveHistory, loadHistory, clearSaved } from './persistence/store.js'

const inr = (v) => `Rs.${v.toLocaleString('en-IN')}`
const cap = (v) => v.charAt(0).toUpperCase() + v.slice(1)



const RULES_COLUMNS = [
  { key: 'ruleId', label: 'Rule ID' },
  { key: 'scope', label: 'Scope', render: cap },
  { key: 'appliesTo', label: 'Applies To', render: (v) => v || 'Entire cart' },
  { key: 'type', label: 'Type', render: cap },
  { key: 'value', label: 'Value', render: (v, row) => (row.type === 'percentage' ? `${v}% off` : `${inr(v)} off`) },
  { key: 'minCartValue', label: 'Condition', render: (v) => (v ? `Cart ≥ ${inr(v)}` : '—') },
  { key: 'stackable', label: 'Stackable', render: (v) => (v ? 'Yes' : 'No') },
]

const CART_COLUMNS = [
  { key: 'itemId', label: 'Item' },
  { key: 'product', label: 'Product' },
  { key: 'brand', label: 'Brand' },
  { key: 'platform', label: 'Platform' },
  { key: 'basePrice', label: 'Base Price', render: inr },
]

const RESULTS_COLUMNS = [
  { key: 'itemId', label: 'Item' },
  { key: 'product', label: 'Product' },
  { key: 'basePrice', label: 'Base Price', render: inr },
  {
    key: 'finalPrice',
    label: 'Final Price',
    render: (v, row) => (
      <span style={{ fontWeight: 700, color: row.totalDiscount > 0 ? '#1e5c2c' : '#131A48' }}>{inr(v)}</span>
    ),
  },
  {
    key: 'totalDiscount',
    label: 'You Save',
    render: (v) => (v > 0 ? <span style={{ color: '#1e5c2c', fontWeight: 600 }}>{inr(v)}</span> : <span style={{ color: '#888' }}>—</span>),
  },
  {
    key: 'reasoning',
    label: 'Offer Applied',
    render: (v) => (
      <span style={{ color: v === 'No offers available' ? '#888' : '#131A48', fontStyle: v === 'No offers available' ? 'italic' : 'normal' }}>{v}</span>
    ),
  },
]



const S = {
  page: { minHeight: '100vh', background: '#f7f7f9', fontFamily: 'Arial, sans-serif' },
  header: { background: '#131A48', padding: '0.85rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoTxt: { fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' },
  logoSpan: { color: '#FF5800' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  main: { maxWidth: 960, margin: '0 auto', padding: '1.8rem 1.5rem' },
  section: { background: '#fff', border: '1px solid #CECECE', borderRadius: 6, padding: '1.2rem 1.4rem', marginBottom: '1.2rem' },
  sectionTitle: { fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 14, color: '#131A48', marginBottom: '0.7rem', paddingBottom: 6, borderBottom: '2px solid #FF5800', display: 'inline-block' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' },
  btn: { background: '#FF5800', color: '#fff', border: 'none', borderRadius: 4, padding: '0.65rem 2rem', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' },
  btnDisabled: { background: '#CECECE', color: '#fff', border: 'none', borderRadius: 4, padding: '0.65rem 2rem', fontSize: 13, fontWeight: 700, cursor: 'not-allowed', letterSpacing: '0.04em', textTransform: 'uppercase' },
  sumRow: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', padding: '0.4rem 0.7rem', fontSize: 13, color: '#131A48' },
}



export default function App() {
  const [rules, setRules] = useState([])
  const [rulesErrors, setRulesErr] = useState([])
  const [rulesFileName, setRulesFileName] = useState('')

  const [cartItems, setCartItems] = useState([])
  const [cartErrors, setCartErrors] = useState([])
  const [cartFileName, setCartFileName] = useState('')

  const [calculated, setCalculated] = useState(false)


  const [dbEnabled, setDbEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [history, setHistory] = useState([])
  const skipNextHistory = useRef(false)

  const canCalculate = rules.length > 0 && cartItems.length > 0
  const results = useMemo(
    () => (calculated && canCalculate ? calculateCart(cartItems, rules) : null),
    [calculated, canCalculate, cartItems, rules]
  )




  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const state = await loadState()
      if (cancelled) return
      if (state.enabled) {
        setDbEnabled(true)
        if (state.rules?.length) { setRules(state.rules); setRulesFileName('saved rules') }
        if (state.cartItems?.length) { setCartItems(state.cartItems); setCartFileName('saved cart') }
        if (state.rules?.length && state.cartItems?.length) {
          skipNextHistory.current = true
          setCalculated(true)
        }
        const h = await loadHistory()
        if (!cancelled) setHistory(h.history ?? [])
      }
      setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => { if (loaded && dbEnabled) saveRules(rules) }, [rules, loaded, dbEnabled])
  useEffect(() => { if (loaded && dbEnabled) saveCart(cartItems) }, [cartItems, loaded, dbEnabled])


  useEffect(() => {
    if (!results || !loaded || !dbEnabled) return
    if (skipNextHistory.current) { skipNextHistory.current = false; return }
    const t = setTimeout(async () => {
      await saveHistory(results)
      const h = await loadHistory()
      setHistory(h.history ?? [])
    }, 800)
    return () => clearTimeout(t)
  }, [results, loaded, dbEnabled])

  async function handleClearSaved() {
    await clearSaved()
    setRules([]); setRulesErr([]); setRulesFileName('')
    setCartItems([]); setCartErrors([]); setCartFileName('')
    setCalculated(false)
    setHistory([])
  }



  function handleRulesLoad(csvText, fileName) {
    const { data, errors } = parseRulesCSV(csvText)
    setRules(data)
    setRulesErr(errors)
    setRulesFileName(fileName)
  }

  function handleCartLoad(csvText, fileName) {
    const { data, errors } = parseCartCSV(csvText)
    setCartItems(data)
    setCartErrors(errors)
    setCartFileName(fileName)
  }

  function handlePdfItems(items, fileName) {
    setCartItems(items)
    setCartFileName(fileName)
    if (rules.length > 0) setCalculated(true)
  }

  function handleRuleConfirm(rule) {
    setRules((prev) => [...prev, rule])
    if (cartItems.length > 0) setCalculated(true)
  }



  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.logoTxt}>O<span style={S.logoSpan}>pp</span>tra</div>
        <div style={S.headerSub}>
          Discount Engine{dbEnabled && <span style={{ marginLeft: 12, color: '#7ddc96' }}>● saved to database</span>}
        </div>
      </div>

      <div style={S.main}>
        <div style={S.grid2}>          <div style={S.section}>
            <div style={S.sectionTitle}>Discount Rules</div>
            <CsvUploader label="rules.csv" description="Upload your discount rules CSV" onLoad={handleRulesLoad} hasData={rulesFileName !== ''} fileName={rulesFileName} />
            <ErrorBanner errors={rulesErrors} />

            <div style={{ fontSize: 11, fontWeight: 700, color: '#131A48', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '1rem 0 6px' }}>
              Or describe a rule in plain English
            </div>
            <RuleInput rules={rules} cartItems={cartItems} onConfirm={handleRuleConfirm} />

            {rules.length > 0 && (
              <div style={{ marginTop: '0.9rem' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{rules.length} rule{rules.length > 1 ? 's' : ''} active</div>
                <DataTable columns={RULES_COLUMNS} rows={rules} />
              </div>
            )}
          </div>          <div style={S.section}>
            <div style={S.sectionTitle}>Cart Items</div>
            <CsvUploader label="cart.csv" description="Upload your cart CSV" onLoad={handleCartLoad} hasData={cartItems.length > 0} fileName={cartFileName} />
            <PdfUploader rules={rules} cartItems={cartItems} onItems={handlePdfItems} onErrors={setCartErrors} />
            <ErrorBanner errors={cartErrors} />
            {cartItems.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{cartItems.length} item{cartItems.length > 1 ? 's' : ''} loaded</div>
                <DataTable columns={CART_COLUMNS} rows={cartItems} />
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <button style={canCalculate ? S.btn : S.btnDisabled} onClick={() => setCalculated(true)} disabled={!canCalculate}>
            Calculate Discounts
          </button>
          {!canCalculate && <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>Load rules and a cart to calculate</div>}
        </div>

        {results && (
          <div style={S.section}>
            <div style={S.sectionTitle}>Cart Summary</div>
            <DataTable columns={RESULTS_COLUMNS} rows={results.items} />

            <div style={{ borderTop: '2px solid #131A48', marginTop: '0.75rem', paddingTop: '0.4rem' }}>
              {results.offer && (
                <>
                  <div style={S.sumRow}>
                    <span>Total before cart offer</span>
                    <span>{inr(results.subtotal)}</span>
                  </div>
                  <div style={{ ...S.sumRow, color: '#1e5c2c', fontWeight: 600 }}>
                    <span>Cart offer: {results.offer.label} — {inr(results.offer.saving)} saved</span>
                    <span>−{inr(results.offer.saving)}</span>
                  </div>
                </>
              )}
              <div style={{ ...S.sumRow, fontWeight: 700, fontSize: 16 }}>
                <span>Cart Total</span>
                <span>{inr(results.finalTotal)}</span>
              </div>
              {!results.offer && results.nearMiss && (
                <div style={{ textAlign: 'right', fontSize: 12, color: '#8a5a00', padding: '0 0.7rem' }}>
                  Add {inr(results.nearMiss.shortBy)} more to unlock the cart offer ({results.nearMiss.rule.type === 'percentage' ? `${results.nearMiss.rule.value}% off` : `${inr(results.nearMiss.rule.value)} off`} on {inr(results.nearMiss.rule.minCartValue)}+)
                </div>
              )}
            </div>
          </div>
        )}

        {dbEnabled && (
          <div style={S.section}>
            <div style={S.sectionTitle}>History</div>
            <HistoryPanel history={history} onClear={handleClearSaved} />
          </div>
        )}
      </div>
    </div>
  )
}
