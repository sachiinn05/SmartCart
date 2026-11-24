import { useEffect, useMemo, useRef, useState } from 'react'
import CsvUploader from './components/CsvUploader.jsx'
import PdfUploader from './components/PdfUploader.jsx'
import RuleInput from './components/RuleInput.jsx'
import RuleList from './components/RuleList.jsx'
import CartTable from './components/CartTable.jsx'
import OrderSummary from './components/OrderSummary.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import ErrorBanner from './components/ErrorBanner.jsx'
import { CartIcon, CheckIcon } from './components/icons.jsx'
import { parseRulesCSV, parseCartCSV } from './engine/csvParser.js'
import { calculateCart } from './engine/discountEngine.js'
import { loadState, saveRules, saveCart, saveHistory, loadHistory, clearSaved } from './persistence/store.js'
import basicRules from '../../sample-data/rules.csv?raw'
import basicCart from '../../sample-data/cart.csv?raw'
import bigRules from '../../sample-data/rules-tough.csv?raw'
import bigCart from '../../sample-data/cart-large.csv?raw'

const SAMPLES = {
  basic: { label: 'Basic example (6 items)', rules: basicRules, cart: basicCart },
  big: { label: 'Big example (45 items)', rules: bigRules, cart: bigCart },
}

export default function App() {
  const [rules, setRules] = useState([])
  const [rulesErrors, setRulesErrors] = useState([])
  const [rulesFileName, setRulesFileName] = useState('')

  const [cartItems, setCartItems] = useState([])
  const [cartErrors, setCartErrors] = useState([])
  const [cartFileName, setCartFileName] = useState('')

  const [dbEnabled, setDbEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [history, setHistory] = useState([])
  const skipNextHistory = useRef(false)

  const results = useMemo(
    () => (rules.length > 0 && cartItems.length > 0 ? calculateCart(cartItems, rules) : null),
    [cartItems, rules]
  )
  const baseTotal = cartItems.reduce((sum, i) => sum + i.basePrice, 0)

  useEffect(() => {
    let cancelled = false
    async function restore() {
      const state = await loadState()
      if (cancelled) return
      if (state.enabled) {
        setDbEnabled(true)
        if (state.rules?.length) {
          setRules(state.rules)
          setRulesFileName('From your last visit')
        }
        if (state.cartItems?.length) {
          setCartItems(state.cartItems)
          setCartFileName('From your last visit')
        }
        if (state.rules?.length && state.cartItems?.length) skipNextHistory.current = true
        const h = await loadHistory()
        if (!cancelled) setHistory(h.history ?? [])
      }
      setLoaded(true)
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (loaded && dbEnabled) saveRules(rules)
  }, [rules, loaded, dbEnabled])

  useEffect(() => {
    if (loaded && dbEnabled) saveCart(cartItems)
  }, [cartItems, loaded, dbEnabled])

  useEffect(() => {
    if (!results || !loaded || !dbEnabled) return
    if (skipNextHistory.current) {
      skipNextHistory.current = false
      return
    }
    const timer = setTimeout(async () => {
      await saveHistory(results)
      const h = await loadHistory()
      setHistory(h.history ?? [])
    }, 1200)
    return () => clearTimeout(timer)
  }, [results, loaded, dbEnabled])

  function resetAll() {
    setRules([])
    setRulesErrors([])
    setRulesFileName('')
    setCartItems([])
    setCartErrors([])
    setCartFileName('')
  }

  async function handleClearSaved() {
    await clearSaved()
    resetAll()
    setHistory([])
  }

  function handleRulesLoad(csvText, fileName) {
    const { data, errors } = parseRulesCSV(csvText)
    setRules(data)
    setRulesErrors(errors)
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
  }

  function handleRuleConfirm(rule) {
    setRules((prev) => [...prev, rule])
  }

  function handleRemoveRule(ruleId) {
    setRules((prev) => prev.filter((r) => r.ruleId !== ruleId))
  }

  function loadSample(key) {
    const s = SAMPLES[key]
    handleRulesLoad(s.rules, 'Example rules')
    handleCartLoad(s.cart, 'Example cart')
  }

  const steps = [
    { n: 1, label: 'Add discount rules', done: rules.length > 0 },
    { n: 2, label: 'Add your cart', done: cartItems.length > 0 },
    { n: 3, label: 'See your savings', done: Boolean(results) },
  ]
  const current = steps.find((s) => !s.done)?.n ?? 3

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <div className="brand-row">
            <span className="logo">
              <CartIcon />
            </span>
            <span className="brand">SmartCart</span>
            <span className="grow" />
            {dbEnabled && <span className="saved-badge">Progress saved</span>}
            {(rules.length > 0 || cartItems.length > 0) && (
              <button type="button" className="btn ghost-light" onClick={handleClearSaved}>
                Start over
              </button>
            )}
          </div>
          <h1>Every item gets its best price</h1>
          <p className="sub">
            Add your discount rules and your cart. We pick the best offer for each item, stack the ones that stack, and
            add up what you save.
          </p>
          <ol className="steps">
            {steps.map((s) => (
              <li key={s.n} className={s.done ? 'done' : s.n === current ? 'now' : ''}>
                <span className="num">{s.done ? <CheckIcon /> : s.n}</span>
                {s.label}
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main className="wrap page">
        {results && (
          <section className="results first">
            <h2 className="results-title">
              <span className="step-dot green">3</span> Your savings
            </h2>
            <div className="cart-grid">
              <CartTable items={cartItems} results={results.items} />
              <OrderSummary results={results} baseTotal={baseTotal} />
            </div>
            <h2 className="change-title">Want to change something?</h2>
          </section>
        )}

        <div className="try-bar">
          <span>No files handy? Try an example:</span>
          {Object.entries(SAMPLES).map(([key, s]) => (
            <button key={key} type="button" className="btn orange" onClick={() => loadSample(key)}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="setup">
          <section className="card rules-card">
            <div className="card-head">
              <h2>
                <span className="step-dot indigo">1</span> Discount rules
              </h2>
            </div>
            <CsvUploader
              title="Upload a rules file (CSV)"
              hint="Drop it here or click to browse"
              onLoad={handleRulesLoad}
              fileName={rulesFileName}
            />
            <ErrorBanner errors={rulesErrors} />
            <RuleInput rules={rules} cartItems={cartItems} onConfirm={handleRuleConfirm} />
            <RuleList rules={rules} onRemove={handleRemoveRule} />
          </section>

          <section className="card cart-card">
            <div className="card-head">
              <h2>
                <span className="step-dot orange">2</span> Your cart
              </h2>
            </div>
            <CsvUploader
              title="Upload a cart file (CSV)"
              hint="Drop it here or click to browse"
              onLoad={handleCartLoad}
              fileName={cartFileName}
            />
            <div className="or">or</div>
            <PdfUploader rules={rules} cartItems={cartItems} onItems={handlePdfItems} onErrors={setCartErrors} />
            <ErrorBanner errors={cartErrors} title="Some rows in the PDF were skipped" />
            {cartItems.length > 0 && (
              <div className="cart-count">
                <b>{cartItems.length}</b> item{cartItems.length > 1 ? 's' : ''} in your cart, worth{' '}
                <b>Rs.{baseTotal.toLocaleString('en-IN')}</b>
              </div>
            )}
          </section>
        </div>

        {!results && cartItems.length > 0 && (
          <section className="results">
            <div className="alert amber big">Your cart is loaded. Add at least one discount rule to see the savings.</div>
            <CartTable items={cartItems} />
          </section>
        )}
        {!results && cartItems.length === 0 && rules.length > 0 && (
          <section className="results">
            <div className="alert amber big">Your rules are ready. Now add a cart to price.</div>
          </section>
        )}

        {dbEnabled && <HistoryPanel history={history} onClear={handleClearSaved} />}
      </main>
    </>
  )
}
